'use strict';

angular.module('streamium.home', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'home/home.html',
    controller: 'HomeCtrl'
  });
}])

.controller('HomeCtrl', function($scope, $location, Rates) {
  $scope.prices = [1, 0.1, 0.01];
  $scope.stream = { rate: $scope.prices[0] };

  $scope.normalizeName = function() {
    var name = $scope.stream.name || '';
    name = name.trim().toLowerCase().replace(/ /g, '-').replace(/\\/g, '-');
    $scope.stream.name = name;
  };

  $scope.submit = function() {
    if (!$scope.form.$valid) return;
    $location.url('/provider');
  };

});