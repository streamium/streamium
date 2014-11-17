'use strict';

angular.module('streamium.home', ['ngRoute'])

.config(function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'home/home.html',
    controller: 'HomeCtrl'
  });
})

.controller('HomeCtrl', function($scope, $location, Rates, StreamiumProvider) {
  $scope.prices = [1, 0.1, 0.01];
  $scope.stream = { rate: $scope.prices[0] };

  $scope.normalizeName = function() {
    var name = $scope.stream.name || '';
    name = name.trim().toLowerCase().replace(/ /g, '-').replace(/\\/g, '-');
    $scope.stream.name = name;
  };

  $scope.submit = function() {
    if (!$scope.form.$valid) return;
    console.log('Initializing channel');
    StreamiumProvider.init(
      $scope.stream.name,
      $scope.stream.address,
      $scope.stream.rate,
      function onCretate(err, done) {
        if (err) throw err;
        console.log('DONE');
        $location.url('/provider');
        $scope.$apply();
      });
  };

});