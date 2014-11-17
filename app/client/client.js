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



var consumer = new channel.Consumer({
  network: config.network,
  refundAddress: '2MvmJg8Yb8htySEoAsJTxRQAoPuJmcA7YXW',
  serverPublicKey: '03d051b328f98ddca19bd8d71b65de64cd5fc815c00aa6a3919e01cd35d15313c8',
});
console.log('Funding address: ' + consumer.fundingAddress);
console.log('Refund address: ' + consumer.refundAddress);
