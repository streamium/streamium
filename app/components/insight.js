'use strict';

angular.module('streamium.insight', [])

.service('Insight', function(bitcore, request) {

  var insight = bitcore.transport.explorers.Insight('testnet');

  var queryBalance = function(address, callback) {
    insight.getUnspentUtxos(address, callback);
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
