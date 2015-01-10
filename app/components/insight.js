'use strict';

angular.module('streamium.insight', [])

.service('Insight', function(bitcore) {

  var insight = new bitcore.transport.explorers.Insight('testnet');

  var queryBalance = function(address, callback) {
    return insight.getUnspentUtxos(address, callback);
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
  
  var broadcast = function(tx, callback) {
    return insight.broadcast(tx, callback);
  };

  return {
    checkBalance: queryBalance,
    pollBalance: pollBalance,
    broadcast: broadcast
  };

});
