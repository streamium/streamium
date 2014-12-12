'use strict';

angular.module('streamium.request', [])

.service('request', function() {
  var request = require('request');
  return request;
});
