var channel = require('../');
var bitcore = require('bitcore');


var providerKey = new bitcore.PrivateKey(bitcore.Networks.testnet);

console.log('provider key: ' + providerKey.toString());
