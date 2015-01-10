'use strict';

var Consumer = channel.Consumer;


angular.module('streamium.client.service', [])

.service('StreamiumClient', function(bitcore) {
  var fundingKey = bitcore.PrivateKey('cb5dc68fbcaf37f29139b50fa4664b395c03e49deb966e5d49a629af005d0654');
  var refundKey = 'b65080da83f59a9bfa03841bc82fd0c0d1e036176b2f2c157eaa9547010a042e';
  var refundAddress = bitcore.PrivateKey(refundKey).toAddress();
  var commitmentKey = 'f1a140dc9d795c0aa537329379f645eb961fe42f27c660e10676c07ddf18777f';

  function StreamiumClient() {
    this.peer = this.connection = null;
    this.status = StreamiumClient.STATUS.disconnected;
    this.network = bitcore.Networks.testnet;
    bitcore.Networks.defaultNetwork = bitcore.Networks.testnet;

    this.rate = this.providerKey = null;

    this.config = config.peerJS;
  };

  StreamiumClient.STATUS = {
    disconnected: 'disconnected',
    connecting: 'connecting',
    funding: 'funding',
    ready: 'ready',
    finished: 'finished'
  };

  StreamiumClient.prototype.connect = function(streamId, callback) {
    this.peer = new Peer(null, this.config);
    this.status = StreamiumClient.STATUS.connecting;
    this.fundingCallback = callback;

    var self = this;
    this.peer.on('open', function onOpen(connection) {
      console.log('Open is working, sending data', self.peer);

      self.connection = self.peer.connect(streamId);
      self.connection.on('open', function() {
        self.connection.send({
          type: 'hello',
          payload: ''
        });

        self.connection.on('data', function(data) {
          console.log('New message', data);
          if (!data.type || !self.handlers[data.type]) throw 'Kernel panic'; // TODO!
          self.handlers[data.type].call(self, data.payload);
        });

      });
    });

    this.peer.on('close', function onClose() {
      self.status = StreamiumClient.STATUS.finished;
    });

    this.peer.on('error', function onError(error) {
      self.status = StreamiumClient.STATUS.disconnected;
      console.log('we have an error');
      callback(error);
    });
  };

  StreamiumClient.prototype.handlers = {};
  StreamiumClient.prototype.handlers.hello = function(data) {
    this.rate = data.rate;
    this.providerKey = data.publicKey;
    this.providerAddress = new bitcore.Address(data.paymentAddress);
    this.network = bitcore.Networks.get(this.providerAddress.name);

    this.consumer = new Consumer({
      network: this.network,
      providerPublicKey: this.providerKey,
      providerAddress: this.providerAddress,
      fundingKey: fundingKey,
      commitmentKey: commitmentKey,
      refundKey: refundKey,
      refundAddress: refundAddress
    });
    this.status = StreamiumClient.STATUS.funding;
    this.fundingCallback(null, this.consumer.fundingAddress.toString());
    this.fundingCallback = null;
  };

  StreamiumClient.prototype.handlers.refundAck = function(data) {
    assert(consumer.validateRefund(messageFromProvider));
    this.connection.send({
      type: 'payment',
      payload: this.consumer.getPayment().toJSON()
    });
  };

  StreamiumClient.prototype.handlers.paymentAck = function(data) {
    // TODO: Pass
  };

  StreamiumClient.prototype.askForRefund = function() {
    assert(this.consumer.commitmentTx._inputAmount);
    this.consumer.commitmentTx._updateChangeOutput();
    this.connection.send({
      type: 'sign',
      payload: this.consumer.setupRefund().toJSON()
    });
  };

  return new StreamiumClient();
});
