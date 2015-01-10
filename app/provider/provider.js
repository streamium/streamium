'use strict';

angular.module('streamium.provider', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/provider', {
    templateUrl: 'provider/create.html',
    controller: 'CreateStreamCtrl'
  });

  $routeProvider.when('/provider/:streamId', {
    templateUrl: 'provider/stream.html',
    controller: 'BroadcastStreamCtrl'
  });

  $routeProvider.when('/provider/:streamId/cashout', {
    templateUrl: 'provider/cashout.html',
    controller: 'CashoutStreamCtrl'
  });
}])

.controller('CreateStreamCtrl', function($scope, $location) {
  console.log('Create Ctrl');
})

.controller('BroadcastStreamCtrl', function($scope, $location) {
  console.log('Broadcast Ctrl');
})

.controller('CashoutStreamCtrl', function($scope, $location) {
  console.log('Cashout Ctrl');
});
