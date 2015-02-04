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

.controller('JoinStreamCtrl', function($scope, $routeParams, StreamiumClient, Insight, $location) {
  $scope.client = StreamiumClient;
  $scope.minutes = [5, 10, 30];
  $scope.stream = {};
  $scope.stream.minutes = $scope.minutes[0];
  $scope.stream.founds = 0;
  $scope.stream.name = $routeParams.streamId;

  if (config.DEBUG) $scope.client.change = config.defaults.clientChange;

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

.controller('WatchStreamCtrl', function($location, $routeParams, $scope, video, StreamiumClient, $interval) {
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

      var videoSrc = URL.createObjectURL(stream);
      $scope.videoSrc = videoSrc;
      $scope.$digest();
    });
  };

  StreamiumClient.on('commitmentBroadcast', function() {
    if (!StreamiumClient.peer) {
      StreamiumClient.connect(streamId, function(err, fundingAddress) {
        if (err) throw err;
        startViewer();
      });
    } else {
      startViewer();
    }
  });

  StreamiumClient.on('paymentUpdate', function() {
    $scope.expirationDate = StreamiumClient.getExpirationDate();
  });

  StreamiumClient.on('end', function() {
    console.log('Moving to cashout stream', $routeParams);
    $location.path('/stream/' + $routeParams.streamId + '/cashout');
  });

  $scope.end = function() {
    StreamiumClient.end();
  };
})

.controller('WithdrawStreamCtrl', function($routeParams) {
  console.log('Cashout stream', $routeParams);
});
