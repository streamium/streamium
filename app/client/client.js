'use strict';

angular.module('streamium.client', ['ngRoute'])

.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/join/:streamId', {
      templateUrl: 'client/setup.html',
      controller: 'ClientSetupCtrl'
    });

    $routeProvider.when('/join/:streamId/stream', {
      templateUrl: 'client/stream.html',
      controller: 'ClientStreamCtrl'
    });
  }
])

.controller('ClientSetupCtrl', function($scope, $routeParams, StreamiumClient) {
  $scope.client = StreamiumClient;

  StreamiumClient.connect($routeParams.streamId, function(err, fundingAddress) {
    if (err) throw err;

    console.log('DONE send funds at', fundingAddress);
    $scope.$apply();
  });
})

.controller('ClientStreamCtrl', function($routeParams) {
  console.log('Params', $routeParams);
});
