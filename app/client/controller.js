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

.controller('JoinStreamCtrl', function($scope, $routeParams, StreamiumClient, Insight) {
  $scope.client = StreamiumClient;

  console.log('Join stream');
  
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
      $scope.funded = true;
      $scope.$apply();
      console.log('updated balance');
    };
    Insight.pollBalance(fundingAddress, updateBalance);
  });

  $scope.submit = function() {
    StreamiumClient.askForRefund();
  };
})

.controller('WatchStreamCtrl', function($routeParams) {
  console.log('Watch Stream', $routeParams);
})

.controller('WithdrawStreamCtrl', function($routeParams) {
  console.log('Cashout stream', $routeParams);
});
