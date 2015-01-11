'use strict';

var config = {

  network: 'testnet',
  peerJS: {
    key: 'lwjd5qra8257b9',
    host: '192.168.0.7',
    port: 9000,
    debug: 0,
    config: {
      'iceServers': [{
        url: 'stun:stun.l.google.com:19302'
      }]
    }
  }

};
