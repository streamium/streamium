'use strict';

angular.module('streamium.provider', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/provider', {
    templateUrl: 'provider/stream.html',
    controller: 'ProviderStreamCtrl'
  });

  $routeProvider.when('/provider/cashout', {
    templateUrl: 'provider/cashout.html',
    controller: 'ProviderCashoutCtrl'
  });
}])

.controller('ProviderStreamCtrl', function($scope, $location, StreamiumProvider) {
  if (StreamiumProvider.status == 'disconnected') return $location.url('/');

  $scope.client = StreamiumProvider;
})

.controller('ProviderCashoutCtrl', function() {

});