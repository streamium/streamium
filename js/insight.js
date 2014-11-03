'use strict';

var bitcore = require('bitcore');
var baseURL = 'https://test-insight.bitpay.com:443/';

var Insight = function() {};

Insight.prototype.pushTx = function(rawtx, cb) {};

function getUTXOs(address) {
  $.ajax({
    url: baseURL + 'api/addr/' + address + '/utxo',
  }).done(function(utxos) {
    if (utxos.length) {
      document.dispatchEvent(new CustomEvent('utxos', { 'detail': utxos }));
    }
  }).fail(function(error) {
    console.log('Insight connection error: ' + error);
  });
}

Insight.prototype.watchAdress = function(address) {

  getUTXOs(address);

  var socket = io(baseURL);

  socket.on('connect', function() {
    socket.emit('subscribe', address);
    socket.on(address, function(txid) { getUTXOs(address); });
  });

  socket.on('error', function(error) {
    console.log('Socket connection error: ' + error);
  });
};
