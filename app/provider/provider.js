'use strict';

angular.module('streamium.provider', ['ngRoute'])

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

.controller('CreateStreamCtrl', function($scope, $location) {
  console.log('Create Ctrl');
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
