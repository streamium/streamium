'use strict';

var bitcore = require('bitcore');
var Key = bitcore.Key;

var client = function(room) {

  var peer = new Peer(null, {
    key: 'lwjd5qra8257b9',
    debug: 3,
    config: {
      'iceServers': [{
        url: 'stun:stun.l.google.com:19302'
      }]
    }
  });

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
        // connection.close();
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
