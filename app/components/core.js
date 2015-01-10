'use strict';

// var Provider = channel.Provider;
// var Consumer = channel.Consumer;

angular.module('streamium.core', [])

.service('StreamiumProvider', function(bitcore) {

  var Address = bitcore.Address;

  function StreamiumProvider() {
    this.address = this.streamId = this.rate = null;
    this.clients = [];

    // TODO: this screams for a status object or add status into Provider
    this.mapClientIdToProvider = {};
    this.mapClientIdToStatus = {};
    this.config = config.peerJS;
  }

  StreamiumProvider.STATUS = {
    disconnected: 'disconnected',
    connecting: 'connecting',
    ready: 'ready',
    finished: 'finished'
  };

  StreamiumProvider.prototype.init = function(streamId, address, rate, callback) {
    if (!streamId || !address || !rate || !callback) return callback('Invalid arguments');

    address = new Address(address);
    if (!address.isValid()) return callback('Invalid address');

    this.streamId = streamId;
    this.address = address;
    this.rate = rate;

    this.peer = new Peer(this.streamId, this.config);
    var self = this;
    this.peer.on('open', function onOpen() {
      console.log('Conected to peer:', self.peer);
      callback(null, true);
    });

    this.peer.on('close', function onClose() {
      self.status = StreamiumProvider.STATUS.finished;
    });

    this.peer.on('error', function onError(error) {
      self.status = StreamiumProvider.STATUS.disconnected;
      console.log('we have an error');
      callback(error);
    });

    this.peer.on('connection', function onConnection(connection) {
      console.log('New connection!', connection);

      connection.on('data', function(data) {
        console.log('New message', data);
        if (!data.type || !self.handlers[data.type]) throw 'Kernel panic'; // TODO!
        self.handlers[data.type].call(self, connection, data.payload);
      });

    });

    // Init Provider
    // Change status
  };

  StreamiumProvider.prototype.handlers = {};

  StreamiumProvider.prototype.handlers.hello = function(connection, data) {

    // TODO: Assert state

    var provider = new Provider({
      network: this.address.network(),
      paymentAddress: this.address,
    });

    this.mapClientIdToProvider[connection.peer.id] = provider;
    this.mapClientIdToStatus[connection.peer.id] = StreamiumProvider.STATUS.disconnected;

    connection.send({
      type: 'hello',
      payload: {
        pubkey: provider.getPublicKey(),
        address: this.address.toString(),
        rate: this.rate
      }
    });
  };

  StreamiumProvider.prototype.handlers.sign = function(connection, data) {

    // TODO: Assert state

    var provider = this.mapClientIdToProvider[connection.peer.id];
    var status = this.mapClientIdToStatus[connection.peer.id];

    connection.send({
      type: 'refundAck',
      payload: provider.signRefund(data)
    });
  };

  StreamiumProvider.prototype.handlers.payment = function(connection, data) {

    // TODO: Assert state

    // TODO: this looks like duplicated code
    var provider = this.mapClientIdToProvider[connection.peer.id];
    var status = this.mapClientIdToStatus[connection.peer.id];

    assert(provider.validPayment(data));
    // TODO: Do some check with provider.currentAmount

    connection.send({
      type: 'paymentAck',
      payload: {
        success: true,
        nextTimeout: 0 // TODO: Signal when the next payment is due
      }
    });
  };

  StreamiumProvider.prototype.getLink = function() {
    if (this.status == StreamiumProvider.STATUS.disconnected) throw 'Invalid State';
    return 'https://streamium.io/join/' + this.streamId;
  };

  return new StreamiumProvider();
})

.service('StreamiumClient', function(bitcore) {

  function StreamiumClient() {
    this.peer = this.connection = null;
    this.status = StreamiumClient.STATUS.disconnected;

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
    this.providerKey = data.pubkey;
    this.providerAddress = new bitcore.Address(data.address);
    this.network = this.providerAddress.network().name;

    this.consumer = new Consumer({
      network: this.network,
      providerPublicKey: this.providerKey,
      providerAddress: this.providerAddress
    });
    this.status = StreamiumClient.STATUS.funding;
    this.fundingCallback(null, this.consumer.fundingAddress.toString());
    this.fundingCallback = null;
  };

  StreamiumClient.prototype.handlers.refundAck = function(data) {
    assert(consumer.validateRefund(messageFromProvider));
    this.connection.send({
      type: 'payment',
      payload: this.consumer.getPayment()
    });
  };

  StreamiumClient.prototype.handlers.paymentAck = function(data) {
    // TODO: Pass
  };

  StreamiumClient.prototype.askForRefund = function() {
    this.connection.send({
      type: 'sign',
      payload: this.consumer.getRefundTxToSign()
    });
  };

  return new StreamiumClient();
});
