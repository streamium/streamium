'use strict';

var config = {
  network: 'livenet',
  appPrefix: '', // For testnet, set to '/testnet'
  otherNetwork: 'testnet',
  linkToOther: '/testnet',
  BLOCKCYPHERTX: 'https://api.blockcypher.com/v1/btc/'
    + 'main' // For testnet, use: 'test3'
    + '/txs/',
  peerJS: {
    key: 'gqjtidom02akyb9',
    //host: '192.168.1.124',
    //port: 9000,
    debug: 0,
    config: {
      'iceServers': [{
        url: 'stun:stun.l.google.com:19302'
      }]
    }
  },
  analytics: true,
  DEBUG: false,
  defaults: {
    providerStream: 'sexybabe69',
    providerPrivkey: '75d79298ce12ea86863794f0080a14b424d9169f7e325fad52f60753eb072afc',
    providerAddress: 'n2Py6DKziqwmSWMxN8vdz7tAV6aabK9LCR',
    providerRate: 0.001,
    clinetPrivkey: 'a831f26d457a5e7edc0cef0eac6fc02dd6a2c032c9e3da8a622f3a26b9aa5fe4',
    clientChange: 'n3pNMEeVec5sMMhMoUseojUTSHw3LDAY3a'
  }
};
