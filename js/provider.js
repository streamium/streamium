'use strict';

var bitcore = require('bitcore');
var Key = bitcore.Key;


// Compatibility shim
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var clients = [];

var provider = function() {

  var insight = new Insight();
  $(document).ready(function() {
    var username = 'sexybitch68';
    var rpm = 0.5;
    var withdrawAddress = '2N2Tc9v76P85hKwj3mdByDdowp5jH5DR2z5';
    var identity = Key.generateSync();
    var provider = new channel.Provider({
      paymentAddress: withdrawAddress
    });

    $('#end-call').click(function() {
      window.existingCall.close();
      $('#provider-success').show();
    });

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

    function connectToPeerJS() {
      var peer = new Peer(username, peerJSConfig);

      peer.on('open', function() {
        $('#roomURL').text(document.URL + peer.id);
      });

      // Receiving a call
      peer.on('connection', function(connection) {
        var deadline;
        var deathnote;
        var call;

        connection.on('data', function(data) {
          var type = data.type;
          var payload = data.payload;
          if (type === 'hello') {
            console.log('client public key: ' + payload);
            connection.send({
              type: 'hello',
              payload: provider.getPublicKey()
            });
          } else if (type === 'refundTx') {
            // validate unsigned refund tx
            if (payload === 'a refund tx') {
              connection.send({
                type: 'refundTx',
                payload: 'signed refund tx'
              });
            }
          } else if (type === 'commitTx') {
            console.log('commitTx: ' + payload);
            console.log('paychan OPEN!');
          } else if (type === 'paymentTx') {
            if (!deadline) {
              deadline = Date.now();
              call = peer.call(connection.peer, window.localStream);
              setupCall(call);
            }
            var extraCredit = payload;
            deadline += extraCredit;
            clearTimeout(deathnote);
            deathnote = setTimeout(function() {
              call.close();
              console.log('closing connection: out of funds');
            }, deadline - Date.now());
            console.log('Remaining paid time: ' + (deadline - Date.now()));
          }
        });


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
        console.log('client ' + clientName + ' out of funds');
      });
    }
  });
};
