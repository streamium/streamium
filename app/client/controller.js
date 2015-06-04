'use strict';

angular.module('streamium.client.controller', ['ngRoute'])

.config(['$routeProvider',
  function($routeProvider) {

    var join = {
      templateUrl: '/app/client/join.html',
      controller: 'JoinStreamCtrl'
    };
    $routeProvider.when('/s/:streamId', join);
    $routeProvider.when('/t/s/:streamId', join);

    var watch = {
      templateUrl: '/app/client/stream.html',
      controller: 'WatchStreamCtrl'
    };
    $routeProvider.when('/s/:streamId/watch', watch);
    $routeProvider.when('/t/s/:streamId/watch', watch);

    var cashout = {
      templateUrl: '/app/client/cashout.html',
      controller: 'WithdrawStreamCtrl'
    };
    $routeProvider.when('/s/:streamId/cashout', cashout);
    $routeProvider.when('/t/s/:streamId/cashout', cashout);
  }
])

.controller('JoinStreamCtrl', function($scope, $routeParams, StreamiumClient, Insight, $location, bitcore) {
  $scope.client = StreamiumClient;
  $scope.minutes = [1, 2, 3, 5, 8, 10, 13, 15, 20, 30, 45, 60, 90, 120, 240];
  $scope.stream = {};
  $scope.stream.minutes = $scope.minutes[1];
  $scope.stream.founds = 0;
  $scope.stream.name = $routeParams.streamId;
  $scope.config = config;

  config.analytics && mixpanel.track('cli-join');

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
      config.analytics && mixpanel.track('cli-funded');
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
    $location.path(config.appPrefix + '/s/' + $routeParams.streamId + '/watch');
  };

})

.controller('WatchStreamCtrl', function($location, $routeParams, $scope, video, StreamiumClient, $interval, bitcore) {
  $scope.message = "";
  $scope.messages = [];
  $scope.name = $routeParams.streamId;

  if (!StreamiumClient.isReady()) {
    $location.path(config.appPrefix + '/s/' + $scope.name);
    return;
  }
  StreamiumClient.askForRefund();
  config.analytics && mixpanel.track('cli-start');
  var startViewer = function() {
    video.setPeer(StreamiumClient.peer);
    video.view($scope.name, function(err, stream) {
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
      config.analytics && mixpanel.track('cli-watch');
    });
  };

  StreamiumClient.on('refundReceived', function() {
    bitcore.util.preconditions.checkState(StreamiumClient.peer, 'StreamiumClient.peer should be set');
    startViewer();
    StreamiumClient.sendFirstPayment();
  });

  StreamiumClient.on('chatroom:message', function(data) {
    $scope.messages.push({
      color: data.color,
      text: data.message
    });
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
    config.analytics && mixpanel.track('cli-ended');
    $location.path(config.appPrefix + '/s/' + $routeParams.streamId + '/cashout');
  });

  $scope.end = function() {
    StreamiumClient.end();
  };

  $scope.chat = function () {
    StreamiumClient.sendMessage($scope.message);
    $scope.message = '';
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
