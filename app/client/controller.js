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
      $scope.fundedSeconds = StreamiumClient.getDuration(funds);
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
      if (err) throw err;

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
    $interval(function() {
      $scope.expirationDate = StreamiumClient.getExpirationDate();
      console.log('expir date: ' + $scope.expirationDate);
      console.log('delta: ' + ($scope.expirationDate - new Date().getTime()));
    }, 2000);
  });

  $scope.end = function() {
    StreamiumClient.end();
    $location.path('/stream/' + $routeParams.streamId + '/cashout');
  };

})

.controller('WithdrawStreamCtrl', function($routeParams) {
  console.log('Cashout stream', $routeParams);
});
