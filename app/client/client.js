'use strict';

angular.module('streamium.client', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/join/:streamId', {
    templateUrl: 'client/setup.html',
    controller: 'ClientSetupCtrl'
  });

  $routeProvider.when('/join/:streamId/stream', {
    templateUrl: 'client/stream.html',
    controller: 'ClientStreamCtrl'
  });
}])

.controller('ClientSetupCtrl', function($routeParams) {
  console.log('Params', $routeParams);
})

.controller('ClientStreamCtrl', function($routeParams) {
  console.log('Params', $routeParams);
});