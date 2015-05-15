'use strict';
var bitcore = require('bitcore');
var fs = require('fs');
var PrivateKey = bitcore.PrivateKey;
var Consumer = require('../lib/Consumer');

var fundingKey = new PrivateKey('cb5dc68fbcaf37f29139b50fa4664b395c03e49deb966e5d49a629af005d0654');
var refundKey = new PrivateKey('b65080da83f59a9bfa03841bc82fd0c0d1e036176b2f2c157eaa9547010a042e');
var commitmentKey = new PrivateKey('f1a140dc9d795c0aa537329379f645eb961fe42f27c660e10676c07ddf18777f');

var providerKey = new PrivateKey('75d79298ce12ea86863794f0080a14b424d9169f7e325fad52f60753eb072afc');

var consumer = new Consumer({
  fundingKey: fundingKey,
  refundKey: refundKey,
  refundAddress: refundKey.toAddress(),
  commitmentKey: commitmentKey,
  providerPublicKey: providerKey.publicKey,
  providerAddress: providerKey.toAddress()
});

var insight = new bitcore.transport.explorers.Insight();

insight.getUnspentUtxos(consumer.fundingAddress, function(err, utxos) {
  consumer.processFunding(utxos);
  consumer.commitmentTx._updateChangeOutput();
  fs.writeFileSync('unsigned.refund.log', consumer.setupRefund().toJSON());
  console.log(consumer.commitmentTx.toString());
  fs.writeFileSync('commitment.log', consumer.commitmentTx.toJSON());
});
