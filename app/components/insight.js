'use strict';

angular.module('streamium.insight', [])

.service('Insight', function(bitcore, explorers) {

  var insight = new explorers.Insight(config.network);

  var queryBalance = function(address, callback) {
    insight.getUnspentUtxos(address, callback);
  };

  var validateUTXOS = function(utxos) {
    return utxos.length === 0;
  };

  var pollBalance = function(address, callback) {
    queryBalance(address, function(err, utxos) {
      if (err) {
        return setTimeout(function() {
          pollBalance(address, callback);
        }, 10000);
      }
      // if no utxos found in that address...
      if (validateUTXOS(utxos)) {
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
