'use strict';

var bitcore = require('bitcore');
var Key = bitcore.Key;


// Compatibility shim
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var clients = [];

var provider = function() {

  var insight = new Insight();
  $(document).ready(function() {
    var username = 'sexybitch69';
    var rpm = 0.5;
    var withdrawAddress = '2N2Tc9v76P85hKwj3mdByDdowp5jH5DR2z5';
    var identity = Key.generateSync();


    $('#end-call').click(function() {
      window.existingCall.close();
      $('#provider-success').show();
    });

    step1();

    function step1() {
      navigator.getUserMedia({
        audio: false,
        video: true
      }, function(stream) {
        $('#video').prop('src', URL.createObjectURL(stream));
        window.localStream = stream;
        connectToPeerJS();
      }, function() {
        $('#step1-error').show();
      });
    }

    function connectToPeerJS() {
      var peer = new Peer(username, peerJSConfig);

      peer.on('open', function() {
        $('#roomURL').text(document.URL + peer.id);
      });

      // Receiving a call
      peer.on('connection', function(connection) {
        // TODO: setup payment channel

        console.log('sending hello');
        connection.send('hello');
        /*
        connection.on('data', function(data) {
          console.log('DATA ON PROVIDER ' + data);
          var call = peer.call(connection.peer, window.localStream);
          setupCall(call);
        });
       */

      });
      peer.on('error', function(err) {
        console.log('peer error: ' + JSON.stringify(err));
        setTimeout(connectToPeerJS, 1000); // reconnect in 1 sec
      });
      $('#step1').hide();
      $('#step2').show();
    }

    var updateClientList = function() {};

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
