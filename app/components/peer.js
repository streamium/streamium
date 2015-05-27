'use strict';


angular.module('streamium.peer', [])

.service('PeerJS', function(bitcore) {

  function getPeerJSConfig(config, index) {
    if (index >= config.peerServers.length) throw new Error('Invalid Server number');

    var ret = angular.copy(config.peerJS);
    bitcore.deps._.extend(ret, config.peerServers[index]);
    ret.index = index;
    return ret;
  }

  return {
    primary: getPeerJSConfig(config, 0),
    secondary: getPeerJSConfig(config, 1),
    get: function(index) {
      return getPeerJSConfig(config, index);
    }
  };

});
