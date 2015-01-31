'use strict';

angular.module('streamium.provider.service', [])

.service('StreamiumProvider', function(bitcore, channel, events, inherits, Insight) {
  var Provider = channel.Provider;

  var SECONDS_IN_MINUTE = 60;
  var MILLIS_IN_SECOND = 1000;
  var MILLIS_IN_MINUTE = MILLIS_IN_SECOND * SECONDS_IN_MINUTE;

  function StreamiumProvider() {
    this.network = bitcore.Networks.testnet;
    bitcore.Networks.defaultNetwork = bitcore.Networks.testnet;

    this.address = this.streamId = this.rate = null;
    this.clients = [];

    // TODO: this screams for a status object or add status into Provider
    this.mapClientIdToProvider = {};
    this.mapClientIdToStatus = {};
    this.config = config.peerJS;
    events.EventEmitter.call(this);
  }
  inherits(StreamiumProvider, events.EventEmitter);

  StreamiumProvider.STATUS = {
    disconnected: 'disconnected',
    connecting: 'connecting',
    ready: 'ready',
    finished: 'finished'
  };

  StreamiumProvider.prototype.init = function(streamId, address, rate, callback) {
    if (!streamId || !address || !rate || !callback) return callback('Invalid arguments');

    try {
      address = new bitcore.Address(address);
    } catch (e) {
      return callback('Invalid address');
    }

    this.streamId = streamId;
    this.address = address;
    this.rate = rate;
    this.rateSatoshis = bitcore.Unit.fromBTC(rate).toSatoshis();
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
      paymentAddress: this.address
    });

    this.mapClientIdToProvider[connection.peer] = provider;
    this.mapClientIdToStatus[connection.peer] = StreamiumProvider.STATUS.disconnected;

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

    var provider = this.mapClientIdToProvider[connection.peer];
    var status = this.mapClientIdToStatus[connection.peer];
    console.log(data);
    data = JSON.parse(data);

    provider.signRefund(data);
    var refund = provider.refund;

    connection.send({
      type: 'refundAck',
      payload: refund.toJSON()
    });

  };

  StreamiumProvider.prototype.handlers.end = function(connection, data) {
    if (data) {
      StreamiumProvider.prototype.handlers.payment(data);
    }
    this.endBroadcast(connection.peer);
  };

  StreamiumProvider.prototype.endBroadcast = function(peer) {
    Insight.broadcast(this.mapClientIdToProvider[peer].paymentTx, function(err) {
      if (err) {
        console.log(err);
      }
    });
    this.emit('broadcast:end', peer);
  };

  StreamiumProvider.prototype.getExpirationDateFor = function(provider) {
    return provider.startTime +
      provider.refund._outputAmount * bitcore.Unit.fromBTC(this.rate).toSatoshis() / MILLIS_IN_MINUTE;
  };

  StreamiumProvider.prototype.handlers.payment = function(connection, data) {

    // TODO: Assert state
    // TODO: this looks like duplicated code

    var provider = this.mapClientIdToProvider[connection.peer];
    data = JSON.parse(data);

    var firstPayment = !provider.currentAmount;
    provider.validPayment(data);

    if (firstPayment) {
      provider.startTime = new Date().getTime();
    }

    var time = Math.round(provider.currentAmount / (this.rateSatoshis / MILLIS_IN_MINUTE));
    console.log('time is ' + time);
    var expiration = provider.startTime + time;
    var self = this;

    clearTimeout(provider.timeout);
    provider.timeout = setTimeout(function() {
      console.log('DIE');
      self.endBroadcast(connection.peer);
    }, expiration - new Date().getTime());

    console.log('Set new expiration date to ' + new Date(expiration));
    console.log('Current time is ' + new Date());
    console.log(this.getExpirationDateFor(provider));

    if (firstPayment) {
      this.emit('broadcast:start', connection.peer);
    }

    connection.send({
      type: 'paymentAck',
      payload: {
        success: true,
        creditedTime: time
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
