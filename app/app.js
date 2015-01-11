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
  'streamium.video',
  'ja.qr'
]).

config(function($routeProvider, $sceProvider) {
  $routeProvider.otherwise({
    redirectTo: '/provider'
  });
  $sceProvider.enabled(false);
});
