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

.directive('validAddress', ['bitcore',
  function(bitcore) {
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {

        var validator = function(value) {
          if (!value) return;

          var a = new bitcore.Address(value);
          ctrl.$setValidity('validAddress', a.isValid());
          return value;
        };

        ctrl.$parsers.unshift(validator);
      }
    };
  }
]);
