'use strict';

angular.module('streamium.provider.service', [])

.service('StreamiumProvider', function(bitcore, channel) {
  var Provider = channel.Provider;

  var Address = bitcore.Address;
  var key = bitcore.PrivateKey('75d79298ce12ea86863794f0080a14b424d9169f7e325fad52f60753eb072afc');

  function StreamiumProvider() {
    this.network = bitcore.Networks.testnet;
    bitcore.Networks.defaultNetwork = bitcore.Networks.testnet;

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

    try {
      address = new Address(address);
    } catch (e) {
      return callback('Invalid address');
    }

    this.streamId = streamId;
    this.address = address;
    this.rate = rate;
    this.clientConnections = [];

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
      self.clientConnections.push(connection);

      connection.on('data', function(data) {
        console.log('New message', data);
        if (!data.type || !self.handlers[data.type]) throw 'Kernel panic'; // TODO!
        self.handlers[data.type].call(self, connection, data.payload);
      });

      connection.on('error', function(err) {
        console.log(err);
        self.clientConnections.splice(self.clientConnections.indexOf(connection), 1);
      });

      connection.on('close', function() {
        console.log('client connection closed');
        self.clientConnections.splice(self.clientConnections.indexOf(connection), 1);
      });

    });

    // Init Provider
    // Change status
  };

  StreamiumProvider.prototype.handlers = {};

  StreamiumProvider.prototype.handlers.hello = function(connection, data) {

    // TODO: Assert state

    var provider = new Provider({
      network: this.address.network,
      paymentAddress: this.address,
      key: key
    });

    this.mapClientIdToProvider[connection.peer.id] = provider;
    this.mapClientIdToStatus[connection.peer.id] = StreamiumProvider.STATUS.disconnected;

    connection.send({
      type: 'hello',
      payload: {
        publicKey: provider.key.publicKey.toString(),
        paymentAddress: this.address.toString(),
        rate: this.rate
      }
    });
  };

  StreamiumProvider.prototype.handlers.sign = function(connection, data) {

    // TODO: Assert state

    var provider = this.mapClientIdToProvider[connection.peer.id];
    var status = this.mapClientIdToStatus[connection.peer.id];
    var data = JSON.parse(data);

    connection.send({
      type: 'refundAck',
      payload: provider.signRefund(data).refund.toJSON()
    });
  };

  StreamiumProvider.prototype.handlers.payment = function(connection, data) {

    // TODO: Assert state

    // TODO: this looks like duplicated code
    var provider = this.mapClientIdToProvider[connection.peer.id];
    var status = this.mapClientIdToStatus[connection.peer.id];
    var data = JSON.parse(data);

    provider.validPayment(data);
    /*
    try {
      if (provider.validPayment(data)) {
        console.log(data);
        alert('Invalid payment received');
      }
    } catch (e) {
      console.log(e);
      alert('Invalid payment received');
    }
    */
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
    if (this.status === StreamiumProvider.STATUS.disconnected) throw 'Invalid State';
    console.log('Open is working, sending data', self.peer);
    var baseURL = window.location.origin;
    return baseURL + '/app/#/join/' + this.streamId;
  };

  return new StreamiumProvider();
});
