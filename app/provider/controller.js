'use strict';

angular.module('streamium.provider.controller', ['ngRoute'])

.config(['$routeProvider',
  function($routeProvider) {
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
  }
])

.controller('CreateStreamCtrl', function($scope, $location, StreamiumProvider) {
  $scope.prices = [1, 0.1, 0.01];
  $scope.stream = {
    rate: $scope.prices[0]
  };
  $scope.stream.name = 'sexybabe69';
  $scope.stream.address = 'mjhohspVMgcuetHwkH74C2aVKfTdyYdVSP';
  $scope.stream.rate = 0.1;

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
      function onCreate(err, done) {
        if (err) throw err;
        $location.path('/provider/' + $scope.stream.name);
        $scope.$apply();
      });
  };
})

.controller('BroadcastStreamCtrl', function($scope, $location, video, StreamiumProvider) {
  var name = $location.$$url.split('/')[2];
  var startVideo = function() {
    $scope.client = StreamiumProvider;
    video.init(function(err, stream) {
      if (err) {
        console.log(err);
        return;
      }
      var videoSrc = URL.createObjectURL(stream);
      $scope.videoSrc = videoSrc;
      $scope.$digest();
    });
  };
  if (!StreamiumProvider.streamId) {
    StreamiumProvider.init(name, 'mjhohspVMgcuetHwkH74C2aVKfTdyYdVSP', 0.1, function(err) {
      if (err) {
        console.log(err);
        return;
      }
      startVideo();
    });
  } else {
    startVideo();
  }
})

.controller('CashoutStreamCtrl', function($scope, $location) {
  console.log('Cashout Ctrl');
});
