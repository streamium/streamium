'use strict';

function getMaybeArray(array) {
  return _.isArray(array) ? array : []
}

function blockcypherToBitcoreOutputFormat(output) {
  return {
    txId: output.tx_hash,
    outputIndex: output.tx_output_n,
    satoshis: output.value,
    script: output.script
  }
}


angular.module('streamium.insight', [])

.service('Insight', function(bitcore, $http) {

  var broadcast = function(tx, callback) {
    $http({
      method: 'POST',
      url: config.BLOCKCYPHERTX + 'push?token=' + config.BLOCKCYPHERTOKEN,
      data: {
        tx: tx
      }
    }).success(function(response, status, headers, config) {
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
    if (address instanceof bitcore.Address) {
      address = address.toString()
    }
    var opts = ['unspentOnly', 'includeScript']
    var urlEncodedOpts = opts.map(opt => opt + '=true').join('&')
    var url = config.BLOCKCYPHER_BASE + '/addrs/' + address + '?' + urlEncodedOpts

    function processAddressInfoIntoOutputs(rawInfo) {
    }

    return $http.get(url).success(function(result) {
      const txs = getMaybeArray(result.txrefs)
      const unconfirmed = getMaybeArray(result.unconfirmed_txrefs)

      callback(null, _.concat(txs, unconfirmed)
        .map(blockcypherToBitcoreOutputFormat)
        .map(bitcore.Transaction.UnspentOutput))
    }).error(callback)
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
