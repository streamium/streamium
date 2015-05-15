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
  $scope.minutes = [1, 2, 3, 5, 8, 10, 13, 15, 20, 25, 30, 45, 60];
  $scope.stream = {};
  $scope.stream.minutes = $scope.minutes[1];
  $scope.stream.founds = 0;
  $scope.stream.name = $routeParams.streamId;

  if (config.DEBUG) {
    $scope.client.change = config.defaults.clientChange;
  }

  StreamiumClient.connect($routeParams.streamId, function(err, fundingAddress) {
    if (err) throw err;

    $scope.fundingAddress = fundingAddress;
    $scope.$apply();

    var updateBalance = function(err, utxos) {
      var funds = 0;
      var utxo;
      for (utxo in utxos) {
        funds += utxos[utxo].satoshis;
      }
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
    StreamiumClient.refundAddress = $scope.changeAddress;
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
      StreamiumClient.setupPaymentUpdates();
    });
  };

  StreamiumClient.on('refundReceived', function() {
    bitcore.util.preconditions.checkState(StreamiumClient.peer, 'StreamiumClient.peer should be set');
    startViewer();
    StreamiumClient.startPaying();
  });

  var calculateSeconds = function() {
    $scope.secondsLeft = Math.floor(($scope.expirationDate - new Date().getTime()) / 1000);
  };
  StreamiumClient.on('paymentUpdate', function() {
    $scope.expirationDate = StreamiumClient.getExpirationDate();
    calculateSeconds();
  });
  $interval(calculateSeconds, 1000);

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

  $scope.spent = StreamiumClient.consumer.paymentTx.paid;
  $scope.duration = Duration.for(StreamiumClient.consumer.paymentTx.paid);
  $scope.change = StreamiumClient.consumer.paymentTx.amount - StreamiumClient.consumer.paymentTx.paid;
  $scope.transaction = StreamiumClient.consumer.paymentTx.id;

  $scope.transactionUrl = 'https://' + (bitcore.Networks.defaultNetwork.name === 'testnet' ? 'testnet-' : '') + 'insight.bitpay.com/tx/' + $scope.transaction;

});
