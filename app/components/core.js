'use strict';


var Provider = channel.Provider;
var Consumer = channel.Consumer;

angular.module('streamium.core', [])

.service('StreamiumProvider', function(bitcore) {

  function StreamiumProvider() {
    this.address = this.streamId = this.rate = null;
    this.clients = [];
    this.status = this.STATUS.disconnected;

    this.config = config.peerJS;

  }

  StreamiumProvider.prototype.STATUS = {
    disconnected: 'disconnected',
    connecting: 'connecting',
    ready: 'ready',
    finished: 'finished'
  };

  StreamiumProvider.prototype.init = function(streamId, address, rate, callback) {
    if (!streamId || !address || !rate || !callback) return callback('Invalid arguments');

    address = new bitcore.Address(address);
    if (!address.isValid()) return callback('Invalid address');

    this.status = this.STATUS.connecting;

    this.streamId = streamId;
    this.address = address;
    this.rate = rate;

    this.peer = new Peer(this.streamId, this.config);
    var self = this;
    this.peer.on('open', function onOpen() {
      console.log('Open is working', self.peer);
      self.status = self.STATUS.ready;
      callback(null, true);
    });

    this.peer.on('close', function onClose() {
      self.status = self.STATUS.finished;
    });

    this.peer.on('error', function onError(error) {
      self.status = self.STATUS.disconnected;
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
    connection.send({
      type: 'hello',
      payload: {
        rate: this.rate,
        pubkey: 'server pubkey'
      }
    });
  };

  StreamiumProvider.prototype.getLink = function() {
    if (this.status == this.STATUS.disconnected) throw 'Invalid State';
    return 'https://streamium.io/join/' + this.streamId;
  };

  return new StreamiumProvider();
})

.service('StreamiumClient', function() {

  function StreamiumClient() {
    this.peer = this.connection = null;
    this.status = this.STATUS.disconnected;

    this.rate = this.providerKey = null;

    this.config = config.peerJS;
  };

  StreamiumClient.prototype.STATUS = {
    disconnected: 'disconnected',
    connecting: 'connecting',
    funding: 'funding',
    ready: 'ready',
    finished: 'finished'
  };

  StreamiumClient.prototype.connect = function(streamId, callback) {
    this.peer = new Peer(null, this.config);
    this.status = this.STATUS.connecting;
    this.fundingCallback = callback;

    var self = this;
    this.peer.on('open', function onOpen(connection) {
      console.log('Open is working, sending data', self.peer);

      self.connection = self.peer.connect(streamId);
      self.connection.on('open', function() {
        self.connection.send({
          type: 'hello',
          payload: 'client pubkey'
        });

        self.connection.on('data', function(data) {
          console.log('New message', data);
          if (!data.type || !self.handlers[data.type]) throw 'Kernel panic'; // TODO!
          self.handlers[data.type].call(self, data.payload);
        });

      });
    });

    this.peer.on('close', function onClose() {
      self.status = self.STATUS.finished;
    });

    this.peer.on('error', function onError(error) {
      self.status = self.STATUS.disconnected;
      console.log('we have an error');
      callback(error);
    });
  };

  StreamiumClient.prototype.handlers = {};
  StreamiumClient.prototype.handlers.hello = function(data) {
    this.rate = data.rate;
    this.providerKey = data.pubkey;

    this.fundingAddress = 'mkYY5NRvikVBY1EPtaq9fAFgquesdjqECw'; // TODO: GET FUNDIND ADDRESS
    this.status = this.STATUS.funding;
    this.fundingCallback(null, this.fundingAddress);
    this.fundingCallback = null;
  };

  return new StreamiumClient();
});
