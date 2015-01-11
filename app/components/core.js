'use strict';

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
});

