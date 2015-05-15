var channel = require('../');
var bitcore = require('bitcore');


var refundKey = new bitcore.PrivateKey(bitcore.Networks.testnet);
var fundingKey = new bitcore.PrivateKey(bitcore.Networks.testnet);
var commitmentKey = new bitcore.PrivateKey(bitcore.Networks.testnet);

console.log('funding key: ' + refundKey.toString());
console.log('refund key: ' + fundingKey.toString());
console.log('commitment key: ' + commitmentKey.toString());
