'use strict';

angular.module('streamium.insight', [])

.service('Insight', function(bitcore, request) {

  var queryBalance = function(address, callback) {
    var url = ('https://' +
        (address.network() === bitcore.network.mainnet ? '' : 'test-') +
        'insight.bitpay.com/api/addr/' + address.toString() + '/utxo'
    );
    request(url, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        console.error(error, response);
        return callback({error: error});
      }
      return callback(JSON.parse(body));
    });
  };

  var pollBalance = function(address, callback) {
    queryBalance(address, function(err, response) {
      if (err) {
        return setTimeout(pollBalance, 10000);
      }
      if (response.length === 0) {
        return setTimeout(pollBalance, 10000);
      } else {
        return callback(null, response);
      }
    });
  };

  return {
    checkBalance: queryBalance,
    pollBalance: pollBalance
  };

});
