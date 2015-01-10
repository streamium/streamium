'use strict';

// Declare app level module which depends on views, and components
angular.module('streamium', [
  'ngRoute',
  'streamium.client',
  'streamium.provider',
  'streamium.rates',
  'streamium.bitcoin',
  'streamium.core',
  'streamium.video'
]).

config(function($routeProvider, $sceProvider) {
  $routeProvider.otherwise({
    redirectTo: '/provider'
  });
  $sceProvider.enabled(false);
});
