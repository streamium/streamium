'use strict';

angular.module('streamium.client.controller', ['ngRoute'])

.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/join/:streamId', {
      templateUrl: 'client/join.html',
      controller: 'JoinStreamCtrl'
    });

    $routeProvider.when('/stream/:streamId', {
      templateUrl: 'client/stream.html',
      controller: 'WatchStreamCtrl'
    });

    $routeProvider.when('/stream/:streamId/cashout', {
      templateUrl: 'client/cashout.html',
      controller: 'WithdrawStreamCtrl'
    });
  }
])

.controller('JoinStreamCtrl', function($scope, $routeParams, StreamiumClient, Insight, $location, bitcore) {
  $scope.client = StreamiumClient;
  $scope.minutes = [1, 2, 3, 5, 8, 10, 13, 15, 20, 30, 45, 60, 90, 120, 240];
  $scope.stream = {};
  $scope.stream.minutes = $scope.minutes[1];
  $scope.stream.founds = 0;
  $scope.stream.name = $routeParams.streamId;

  if (!DetectRTC.isWebRTCSupported) {
    return $location.path('/no-webrtc');
  }

  $scope.$watch('stream.minutes', function() {
    $scope.amount = ($scope.stream.minutes * $scope.client.rate).toFixed(8);
    $scope.payUrl = 'bitcoin:' + $scope.fundingAddress + '?amount=' + $scope.amount;
  });

  if (config.DEBUG) {
    $scope.client.change = config.defaults.clientChange;
  }

  StreamiumClient.connect($routeParams.streamId, function(err, fundingAddress) {
    if (err) {
      if (err.type === 'peer-unavailable') {
        $scope.error = 'Unable to connect to stream ' + $routeParams.streamId + ', looks like it\'s offline at the moment.';
      } else {
        $scope.error = 'Unexpected error when trying to join ' + $routeParams.streamId;
      }
      $scope.$apply();
      return;
    }

    $scope.fundingAddress = fundingAddress;
    $scope.amount = ($scope.stream.minutes * $scope.client.rate).toFixed(8);
    $scope.payUrl = 'bitcoin:' + fundingAddress + '?amount=' + $scope.amount;
    $scope.$apply();

    var updateBalance = function(err, utxos) {
      var funds = 0;
      var utxo;
      for (utxo in utxos) {
        funds += utxos[utxo].satoshis;
      }
      $.ajax({
        url: config.BLOCKCYPHERTX + utxos[0].txId,
        dataType: 'json'
      }).done(function(transaction) {
        $scope.client.change = transaction.inputs[0].addresses[0];
        $scope.changeFromTransaction = $scope.client.change;
        $scope.$apply();
      });
      StreamiumClient.processFunding(utxos);
      $scope.funds = funds;
      $scope.fundedMillis = StreamiumClient.getDuration(funds);
      $scope.fundedSeconds = $scope.fundedMillis / 1000;
      $scope.fundedMinutes = $scope.fundedSeconds / 60;
      $scope.funded = true;
      $scope.$apply();
    };
    Insight.pollBalance(fundingAddress, updateBalance);
  });

  $scope.submit = function() {
    StreamiumClient.consumer.refundAddress = $scope.client.change;
    $location.path('/stream/' + $routeParams.streamId);
  };
})

.controller('WatchStreamCtrl', function($location, $routeParams, $scope, video, StreamiumClient, $interval, bitcore) {
  if (!StreamiumClient.isReady()) {
    $location.path('/join/' + $routeParams.streamId);
    return;
  }
  StreamiumClient.askForRefund();
  var streamId = $routeParams.streamId;
  var startViewer = function() {
    video.setPeer(StreamiumClient.peer);
    video.view(streamId, function(err, stream) {
      // called on provider calling us
      if (err) {
        console.log(err);
        StreamiumClient.end();
        return;
      }

      // show provider video on screen
      var videoSrc = URL.createObjectURL(stream);
      $scope.videoSrc = videoSrc;
      $scope.$digest();

      // start sending payments at regular intervals
      $interval(calculateSeconds, 1000);
      StreamiumClient.setupPaymentUpdates();
    });
  };

  StreamiumClient.on('refundReceived', function() {
    bitcore.util.preconditions.checkState(StreamiumClient.peer, 'StreamiumClient.peer should be set');
    startViewer();
    StreamiumClient.sendFirstPayment();
  });

  var calculateSeconds = function() {
    $scope.secondsLeft = Math.floor(($scope.expirationDate - new Date().getTime()) / 1000);
  };
  StreamiumClient.on('paymentUpdate', function() {
    $scope.expirationDate = StreamiumClient.getExpirationDate();
    calculateSeconds();
  });

  StreamiumClient.on('end', function() {
    console.log('Moving to cashout stream', $routeParams);
    $location.path('/stream/' + $routeParams.streamId + '/cashout');
  });

  $scope.end = function() {
    StreamiumClient.end();
  };
})

.controller('WithdrawStreamCtrl', function($scope, $routeParams, StreamiumClient, Duration, bitcore) {
  $scope.client = StreamiumClient;

  $scope.refundTx = StreamiumClient.consumer.refundTx.uncheckedSerialize();
  $scope.displayRefund = StreamiumClient.errored;

  $scope.spent = StreamiumClient.consumer.paymentTx.paid;
  $scope.duration = Duration.for(StreamiumClient.consumer.paymentTx.paid);
  $scope.change = StreamiumClient.consumer.paymentTx.amount - StreamiumClient.consumer.paymentTx.paid;
  $scope.transaction = StreamiumClient.consumer.paymentTx.id;

  $scope.commitmentTx = StreamiumClient.consumer.commitmentTx.uncheckedSerialize();
  $scope.fundingKey = StreamiumClient.consumer.fundingKey.toString();
  $scope.privkey = StreamiumClient.consumer.commitmentKey.toString();
  $scope.serverPubkey = StreamiumClient.consumer.providerPublicKey.toString();
  $scope.contractAddress = StreamiumClient.consumer.commitmentTx.address.toString();

  $scope.addressUrl = 'https://' + (bitcore.Networks.defaultNetwork.name === 'testnet' ? 'test-' : '') + 'insight.bitpay.com/address/' + $scope.contractAddress;

});
