'use strict';

angular.module('streamium.insight', [])

.service('Insight', function(bitcore, explorers) {

  var insight = new explorers.Insight('testnet');

  var queryBalance = function(address, callback) {
    callback(null, [new bitcore.Transaction.UnspentOutput({
      'address': address,
      'txid': 'cc1066d12c4922840c999294ddde4c1be7dc531f52e7d81b821c1f1514c3c8aa',
      'vout': 0,
      'ts': 1408464227,
      'scriptPubKey': bitcore.Script.fromAddress(address).toString(),
      'amount': 0.001,
      'confirmations': 6,
    })]);
    // TODO: should be: 
    // insight.getUnspentUtxos(address, callback);
  };

  var pollBalance = function(address, callback) {
    queryBalance(address, function(err, utxos) {
      if (err) {
        return setTimeout(function() {
          pollBalance(address, callback);
        }, 10000);
      }
      // if no utxos found in that address...
      if (utxos.length === 0) {
        return setTimeout(function() {
          pollBalance(address, callback);
        }, 10000);
      } else {
        return callback(null, utxos);
      }
    });
  };

  return {
    checkBalance: queryBalance,
    pollBalance: pollBalance,
    broadcast: insight.broadcast.bind(insight)
  };

});
