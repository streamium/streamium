var bitcore = require('bitcore');
var fs = require('fs');
var PrivateKey = bitcore.PrivateKey;
var Provider = require('../lib/Provider');

var providerKey = new PrivateKey('75d79298ce12ea86863794f0080a14b424d9169f7e325fad52f60753eb072afc');

var provider = new Provider({
  key: providerKey,
  paymentAddress: providerKey.toAddress()
});

var refund = JSON.parse(fs.readFileSync('unsigned.refund.log'));

fs.writeFileSync('signed.refund.log', provider.signRefund(refund).refund.toJSON());

