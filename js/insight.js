'use strict';

var bitcore = require('bitcore');


var baseURL = 'https://test-insight.bitpay.com/';

var Insight = function() {

};

Insight.prototype.getUTXOs = function(address, cb) {
  $.ajax({
    url: baseURL + 'api/addr/' + address + '/utxo',
  }).done(cb)
    .fail(function(e) {
      cb(e);
    });
};

Insight.prototype.pushTx = function(rawtx, cb) {};
