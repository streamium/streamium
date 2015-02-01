'use strict';

angular.module('streamium.bitcoin', [])

.factory('bitcore', function() {
  return require('bitcore');
})
.factory('explorers', function() {
  return require('bitcore-explorers');
})
.factory('channel', function() {
  return require('bitcore-channel');
})
.factory('events', function() {
  return require('events');
})
.factory('inherits', function() {
  return require('inherits');
})
.factory('async', function() {
  return require('async');
})

.directive('validAddress', ['bitcore',
  function(bitcore) {
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {

        var validator = function(value) {
          console.log('Validate value', value);
          if (!value) return;

          var valid = bitcore.Address.isValid(value, config.network);
          ctrl.$setValidity('validAddress', valid);
          return value;
        };

        ctrl.$parsers.unshift(validator);
      }
    };
  }
]);
