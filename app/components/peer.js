'use strict';


angular.module('streamium.peer', [])

.service('PeerJS', function() {

  function getPeerJSConfig(config, index) {
    if (index >= config.peerServers.length) throw new Error('Invalid Server number');

    var ret  = angular.copy(config.peerJS);
    ret.key  = config.peerServers[index].key;
    ret.host = config.peerServers[index].host;
    ret.port = config.peerServers[index].port;
    ret.index = index;
    return ret;
  }

  return {
    primary: getPeerJSConfig(config, 0),
    secondary: getPeerJSConfig(config, 1),
    get: function(index) {
      console.log('INDEX> ', index);
      return getPeerJSConfig(config, index);
    }
  };

});
