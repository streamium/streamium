'use strict';

angular.module('streamium.bitcoin', [])

.factory('bitcore', function() {
  return require('bitcore');
})
.factory('channel', function() {
  return require('bitcore-channel');
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
])
