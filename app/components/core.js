'use strict';

var SECONDS_IN_MINUTE = 60;
var MILLIS_IN_SECOND = 1000;
var MILLIS_IN_MINUTE = MILLIS_IN_SECOND * SECONDS_IN_MINUTE;

angular.module('streamium.core', [])
  .service('Session', function() {

    var KEY_ID = 'privkey';

    function Session() {
      var privateKey = localStorage.getItem(KEY_ID);
      if (!privateKey) {
        this.privateKey = new bitcore.PrivateKey();
        localStorage.setItem(KEY_ID, this.privateKey.toString())
      } else {
        this.privateKey = new bitcore.PrivateKey(privateKey);
      }
    }

    return new Session();
  })

.service('Duration', function(bitcore) {
  var Duration = {};
  Duration.for = function(rate, satoshis) {
    var satRate = bitcore.Unit.fromBTC(rate).toSatoshis();
    return satoshis / satRate * MILLIS_IN_MINUTE;
  };
  return Duration;
});
