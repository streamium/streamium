'use strict';

var bitcore = require('bitcore');

var client = function(room) {
  var insight = new Insight();

  var fundAddress = '2MvmJg8Yb8htySEoAsJTxRQAoPuJmcA7YXW';
  insight.getUTXOs(fundAddress, function(res) {
    //console.log(JSON.stringify(res));
  });

  var peer = new Peer(null, peerJSConfig);

  peer.on('close', function() {
    console.log('Peer connection closed');
  });

  peer.on('error', function(error) {
    console.log('Peer connection error: ', error);
  });

  peer.on('open', function() {
    console.log('Peer id: ' + peer.id);
    var connection = peer.connect(room);

    connection.on('open', function() {
      console.log('connection open');
      connection.on('data', function(data) {
        console.log('dataaaaaaaaaaaa ' + data);
      });
    });
    connection.on('close', function() {
      console.log('Initial connection closed.');
    });
    connection.on('error', function(error) {
      console.log('Initial connection error: ', error);
    });
  });

  peer.on('call', function(connection) {
    connection.answer();
    connection.on('stream', function(stream) {
      $('#video').prop('src', URL.createObjectURL(stream));
    });
    connection.on('close', function() {
      console.log('Media connection closed');
    });
    connection.on('error', function(error) {
      console.log('Media connection error: ', error);
    });
  });
};
