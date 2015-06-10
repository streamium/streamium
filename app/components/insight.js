'use strict';

angular.module('streamium.insight', [])

.service('Insight', function(bitcore, $http) {

  var broadcast = function(tx, callback) {
    $http.post(
      config.BLOCKCYPHERTX + 'push',
      {
        tx: tx
      }
    ).success(function(response, status, headers, config) {
      return callback(null, response.tx.hash);
    }).error(function(response, status, headers, config) {
      if (response.errors.length === 1) {
        var error = response.errors[0].error;
        if (error.indexOf('already included')) {
          return callback(null, response.tx.hash);
        }
      }
      return callback(response.data.errors);
    });
  };

  var queryBalance = function(address, callback) {
    $http.get(
      config.CHAIN + 'addresses/' + address + '/unspents?api-key-id=' + config.CHAIN_API_KEY
    ).success(function(result, status, headers, config) {
      return callback(null, result.map(function(unspent) {
        return new bitcore.Transaction.UnspentOutput({
          txid: unspent.transaction_hash,
          outputIndex: unspent.output_index,
          script: unspent.script_hex,
          satoshis: unspent.value
        });
      }));
    }).error(function(response, status, headers, config) {
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
