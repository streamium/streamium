'use strict';

angular.module('streamium.insight', [])

.service('Insight', function(bitcore) {

  var broadcast = function(tx, callback) {
    $.ajax({
      method: 'POST',
      url: config.BLOCKCYPHERTX + 'push',
      dataType: 'json',
      data: JSON.stringify({
        tx: tx
      })
    }).done(function(response) {
      return callback(null, response.tx.hash);
    }).fail(function(response) {
      return callback(response);
    });
  };

  var queryBalance = function(address, callback) {
    $.ajax({
      url: config.CHAIN + 'addresses/' + address + '/unspents?api-key-id=' + config.CHAIN_API_KEY,
      dataType: 'json'
    }).done(function(result) {
      return callback(null, result.map(function(unspent) {
        return new bitcore.Transaction.UnspentOutput({
          txid: unspent.transaction_hash,
          outputIndex: unspent.output_index,
          script: unspent.script_hex,
          satoshis: unspent.value
        });
      }));
    }).fail(function(response) {
      return callback(response);
    });
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
    broadcast: broadcast
  };

});
