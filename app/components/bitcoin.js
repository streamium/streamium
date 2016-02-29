'use strict';

angular.module('streamium.bitcoin', [])

.factory('bitcore', function() {
    var bitcore = require('bitcore-lib');
    return bitcore;
  })
  .factory('explorers', function() {
    return require('bitcore-explorers');
  })
  .factory('channel', function() {
    return require('bitcore-channel');
  })
  .factory('jQuery', function() {
    return window.jQuery;
  })
  .factory('events', function() {
    return require('events');
  })
  .factory('inherits', function() {
    return require('inherits');
  })

.directive('validAddress', ['bitcore',
  function(bitcore) {
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {

        var validator = function(value) {
          if (!value) return;

          var valid = bitcore.Address.isValid(value, config.network);
          ctrl.$setValidity('validAddress', valid);
          return valid ? value : undefined;
        };

        ctrl.$parsers.unshift(validator);
        ctrl.$formatters.unshift(function(value) {
          ctrl.$setValidity('validAddress', bitcore.Address.isValid(value, config.network));
          return value;
        });
      }
    };
  }
]);
