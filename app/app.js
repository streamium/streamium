'use strict';

// Declare app level module which depends on views, and components
angular.module('streamium', [
  'ngRoute',
  'streamium.client.service',
  'streamium.client.controller',
  'streamium.provider.service',
  'streamium.provider.controller',
  'streamium.rates',
  'streamium.bitcoin',
  'streamium.insight',
  'streamium.core',
  'streamium.streamer',
  'streamium.video',
  'streamium.peer',
  'luegg.directives',
  'angularMoment',
  'ja.qr'
]).

// This prevents bitcoin: links to be preffixed by angular with "unsafe:"
config(function ($compileProvider) {   
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|bitcoin|ftp|mailto|chrome-extension):/);
}).

config(function($routeProvider, $sceProvider, $locationProvider) {
  $routeProvider.otherwise({
    redirectTo: '/'
  });
  $sceProvider.enabled(false);
  $locationProvider.html5Mode(true);
})

.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/no-webrtc', {
      templateUrl: 'error.html'
    });
  }
]);
