'use strict';

angular.module('streamium.provider.service', [])

.service('StreamiumProvider', function(bitcore, channel, events, inherits, Insight, Duration) {
  var Provider = channel.Provider;

  var SECONDS_IN_MINUTE = 60;
  var MILLIS_IN_SECOND = 1000;
  var MILLIS_IN_MINUTE = MILLIS_IN_SECOND * SECONDS_IN_MINUTE;

  function StreamiumProvider() {
    this.network = bitcore.Networks.testnet;
    bitcore.Networks.defaultNetwork = bitcore.Networks.testnet;

    this.address = this.streamId = this.rate = null;

    // TODO: this screams for a status object or add status into Provider
    this.mapClientIdToProvider = {};
    this.mapClientIdToStatus = {};
    this.config = config.peerJS;
    events.EventEmitter.call(this);
  }
  inherits(StreamiumProvider, events.EventEmitter);

  StreamiumProvider.STATUS = {
    disconnected: 'disconnected', // finished abnormally
    connecting: 'connecting', // started the dance
    waiting: 'waiting', // waiting for first payment (plus commitment tx)
    ready: 'ready', // receiving payments
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
      console.log('Connected to peer server:', self.peer);
      callback();
    });

    this.peer.on('close', function onClose() {
      console.log('Connection to peer server closed');
      self.status = StreamiumProvider.STATUS.finished;
    });

    this.peer.on('error', function onError(error) {
      console.log('Error with peer server:', error);
      self.status = StreamiumProvider.STATUS.disconnected;
      callback(error);
    });

    this.peer.on('connection', function onConnection(connection) {
      console.log('New peer connected:', connection);
      self.clientConnections.push(connection);

      connection.on('data', function(data) {
        console.log('New message:', data);
        if (!data.type || !self.handlers[data.type]) throw 'Kernel panic'; // TODO!
        self.handlers[data.type].call(self, connection, data.payload);
      });

      connection.on('error', function(error) {
        console.log('Error with peer connection', error);
        self.clientConnections.splice(self.clientConnections.indexOf(connection), 1);
      });

      connection.on('close', function() {
        console.log('Client connection closed');
        self.clientConnections.splice(self.clientConnections.indexOf(connection), 1);
      });
    });

    // Init Provider
    // Change status
  };

  StreamiumProvider.prototype.handlers = {};

  StreamiumProvider.prototype.handlers.hello = function(connection, data) {

    if (connection.peer in this.mapClientIdProvider) {
      console.log('Error: Received `hello` from existing peer:', data);
      return;
    }

    var provider = new Provider({
      network: this.address.network,
      paymentAddress: this.address
    });

    this.mapClientIdToProvider[connection.peer] = provider;
    this.mapClientIdToStatus[connection.peer] = StreamiumProvider.STATUS.connecting;

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

    var provider = this.mapClientIdToProvider[connection.peer];
    var status = this.mapClientIdToStatus[connection.peer];

    if (status !== StreamiumProvider.STATUS.connecting) {
      console.log('Error: Received `sign` from a non-existing or connected peer:', data);
      return;
    }

    console.log('Received a request to sign a refund tx:', data);

    this.mapClientIdToStatus[connection.peer] = StreamiumProvider.STATUS.waiting;

    data = JSON.parse(data);
    provider.signRefund(data);
    var refund = provider.refund;

    connection.send({
      type: 'refundAck',
      payload: refund.toJSON()
    });
  };

  StreamiumProvider.prototype.handlers.end = function(connection, data) {

    if (!(connection.peer in this.mapClientIdProvider)) {
      console.log('Error: Received `end` from non-existing peer:', data);
      return;
    }

    if (data) {
      this.handlers.payment(connection, data);
    }

    this.endBroadcast(connection.peer);
  };

  StreamiumProvider.prototype.endBroadcast = function(peerId) {
    var payment = this.mapClientIdToProvider[peerId].paymentTx;
    Insight.broadcast(payment, function(err) {
      if (err) {
        console.log('Error broadcasting ' + payment);
        console.log(err);
      } else {
        console.log('Payment broadcasted correctly');
      }
    });
    this.emit('broadcast:end', peerId);
  };

  StreamiumProvider.prototype.getFinalExpirationFor = function(provider) {

    return provider.startTime + Duration.for(this.rate, provider.refund._outputAmount);
  };

  StreamiumProvider.prototype.handlers.commitment = function(connection, data) {
    var commitment = channel.Transactions.Commitment(JSON.parse(data));

    Insight.broadcast(commitment, function(err) {
      if (err) {
        console.log(err);
        this.emit('broadcast:end', connection);
      }
    });
  };

  StreamiumProvider.prototype.handlers.payment = function(connection, data) {

    var provider = this.mapClientIdToProvider[connection.peer];
    var status = this.mapClientIdToStatus[connection.peer];
    var firstPayment = false;

    if (status === StreamiumProvider.STATUS.waiting) {
      this.mapClientIdToStatus[connection.peer] = StreamiumProvider.STATUS.ready;
      provider.startTime = new Date().getTime();
      firstPayment = true;
    }

    if (status !== StreamiumProvider.STATUS.ready) {
      console.log('Error: Received `payment` from a non-existing or unprepared peer:', data);
      return;
    }

    data = JSON.parse(data);
    provider.validPayment(data);

    var refundExpiration = this.getFinalExpirationFor(provider);
    var paymentsExpiration = provider.startTime + Duration.for(this.rate, provider.currentAmount);
    var expiration = Math.min(refundExpiration, paymentsExpiration);
    var self = this;

    clearTimeout(provider.timeout);
    provider.timeout = setTimeout(function() {
      console.log('Peer connection timed out');
      self.endBroadcast(connection.peer);
    }, Math.min(expiration, finalExpiration) - new Date().getTime());

    console.log('Set new expiration date to ' + new Date(expiration));
    console.log('Current time is ' + new Date());
    console.log('Expiration for the refund tx is ' + new Date(refundExpiration));

    if (firstPayment) {
      this.emit('broadcast:start', connection.peer);
    }

    connection.send({
      type: 'paymentAck',
      payload: {
        success: true,
      }
    });
  };

  StreamiumProvider.prototype.endAllBroadcasts = function() {
    var self = this;
    async.map(_.keys(this.mapClientIdToProvider), function(client) {
      self.endBroadcast(client);
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
