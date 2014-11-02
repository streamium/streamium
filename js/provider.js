'use strict';

var bitcore = require('bitcore');
var Key = bitcore.Key;
var peerJSOpts = {
  key: 'lwjd5qra8257b9',
  debug: 3,
  config: {
    'iceServers': [{
      url: 'stun:stun.l.google.com:19302'
    }]
  }
}

// Compatibility shim
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var clients = [];

var provider = function() {

  $(document).ready(function() {
    var username = 'somebitch69';
    var rpm = 0.5;
    var withdrawAddress = '2N2Tc9v76P85hKwj3mdByDdowp5jH5DR2z5';
    var k = Key.generateSync();
    console.log(k.private.toString('hex'));

    var peer = new Peer(username, peerJSOpts);

    peer.on('open', function() {
      $('#roomURL').text(document.URL + peer.id);
    });

    // Receiving a call
    peer.on('connection', function(connection) {
      // TODO: setup payment channel
      console.log(JSON.stringify(connection.peer));
      var call = peer.call(connection.peer, window.localStream);
      setupCall(call);
    });
    peer.on('error', function(err) {
      console.log('peer error: ' + JSON.stringify(err));
      step2();
    });

    // Click handlers setup
    $(function() {
      $('#end-call').click(function() {
        window.existingCall.close();
        $('#provider-success').show();
      });

      // Get things started
      step1();
    });

    function step1() {
      navigator.getUserMedia({
        audio: false,
        video: true
      }, function(stream) {
        $('#video').prop('src', URL.createObjectURL(stream));
        window.localStream = stream;
        step2();
      }, function() {
        $('#step1-error').show();
      });
    }

    function step2() {
      $('#step1').hide();
      $('#step2').show();
    }

    var updateClientList = function() {
      console.dir(clients);
    };

    function setupCall(call) {
      var clientName = call.peer;
      clients.unshift(clientName);
      updateClientList();

      call.on('close', function() {
        alert('call closed with ' + clientName);
      });
    }
  });
};
