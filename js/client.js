'use strict';



var client = function(room) {

  document.addEventListener('utxos', function(e) {
    console.log(e.detail);
  });

  var refundAddress = '2MvmJg8Yb8htySEoAsJTxRQAoPuJmcA7YXW';
  var insight = new Insight();


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
      var balance = 300000;
      connection.send({
        type: 'hello',
        payload: 'client pubkey'
      });
      connection.on('data', function(data) {
        var type = data.type;
        var payload = data.payload;
        if (type === 'hello') {
          var consumer = new channel.Consumer({
            network: network,
            refundAddress: refundAddress,
            serverPublicKey: payload
          });
          console.log('Funding address: ' + consumer.getFundingAddress());
          console.log('Refund address: ' + consumer.getRefundAddress());
          insight.watchAdress(consumer.getFundingAddress());
          console.log('Refund transaction: ' + consumer.createCommitmentTx());
          console.log('Refund transaction: ' + consumer.getRefundTxForSigning());
          console.log('server public key: ' + payload);
          connection.send({
            type: 'refundTx',
            payload: 'a refund tx'
          });
        } else if (type === 'refundTx') {
          console.log('refundTx: ' + payload);
          // validate signed refund tx
          if (payload === 'signed refund tx') {
            connection.send({
              type: 'commitTx',
              payload: 'a commit tx'
            });
            connection.send({
              type: 'paymentTx',
              payload: 5000
            });
            balance -= 5000;
            setInterval(function() {
              if (balance <= 0) return;
              console.log('remaining balance: ' + balance);
              connection.send({
                type: 'paymentTx',
                payload: 1000
              });
              balance -= 1000;
            }, 1000);
          }
        }
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
