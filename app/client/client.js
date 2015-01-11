'use strict';

angular.module('streamium.client.service', [])

.service('StreamiumClient', function(bitcore, channel, Insight, events, inherits) {
  var Consumer = channel.Consumer;

  var SECONDS_IN_MINUTE = 60;
  var MILLIS_IN_SECOND = 1000;
  var MILLIS_IN_MINUTE = MILLIS_IN_SECOND * SECONDS_IN_MINUTE;
  var TIMESTEP = 10 * MILLIS_IN_SECOND;

  var fundingKey = bitcore.PrivateKey('cb5dc68fbcaf37f29139b50fa4664b395c03e49deb966e5d49a629af005d0654');
  var refundKey = bitcore.PrivateKey('b65080da83f59a9bfa03841bc82fd0c0d1e036176b2f2c157eaa9547010a042e');
  var refundAddress = bitcore.PrivateKey(refundKey).toAddress();
  var commitmentKey = bitcore.PrivateKey('f1a140dc9d795c0aa537329379f645eb961fe42f27c660e10676c07ddf18777f');

  function StreamiumClient() {
    this.peer = this.connection = null;
    this.status = StreamiumClient.STATUS.disconnected;
    this.network = bitcore.Networks.testnet;
    bitcore.Networks.defaultNetwork = bitcore.Networks.testnet;

    this.rate = this.providerKey = null;

    this.config = config.peerJS;
    events.EventEmitter.call(this);
  }
  inherits(StreamiumClient, events.EventEmitter);


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
    this.stepSatoshis = Math.round(
      TIMESTEP * bitcore.Unit.fromBTC(this.rate).toSatoshis()
      / MILLIS_IN_MINUTE
    );
    console.log(this.rate);

    this.providerKey = data.publicKey;
    this.providerAddress = new bitcore.Address(data.paymentAddress);

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

  StreamiumClient.prototype.processFunding = function(utxos) {
    this.consumer.processFunding(utxos);
  };

  StreamiumClient.prototype.handlers.refundAck = function(data) {
    var self = this;
    data = JSON.parse(data);
    this.consumer.validateRefund(data);

    Insight.broadcast(this.consumer.commitmentTx, function(err) {
      if (err) {
        alert('Impossibe to broadcast to insight');
        return;
      }
      self.startPaying();
    });
  };

  StreamiumClient.prototype.startPaying = function() {

    var self = this;
    var satoshis = 2 * this.stepSatoshis;
    this.startTime = new Date().getTime();
    console.log('Starting at ' + new Date(this.startTime) + ' sending ' + satoshis);

    console.log('Will send again at ' + new Date(this.startTime + TIMESTEP));

    this.interval = setInterval(function() {
      self.updatePayment();
    }, TIMESTEP);

    this.consumer.incrementPaymentBy(satoshis);
    this.sendPayment();
  };

  StreamiumClient.prototype.updatePayment = function() {
    console.log('updating');

    this.consumer.incrementPaymentBy(this.stepSatoshis);
    this.consumer.paymentTx._updateChangeOutput();
    this.sendPayment();
  };

  StreamiumClient.prototype.sendPayment = function() {
    this.connection.send({
      type: 'payment',
      payload: this.consumer.paymentTx.toJSON()
    });
  };

  StreamiumClient.prototype.handlers.paymentAck = function(data) {
    // TODO: Pass
  };

  StreamiumClient.prototype.isReady = function() {
    return !!this.consumer;
  };

  StreamiumClient.prototype.askForRefund = function() {
    if (!this.consumer.commitmentTx._inputAmount) {
      console.log('Error');
      alert('No funds');
      return;
    }
    this.consumer.commitmentTx._updateChangeOutput();
    var payload = this.consumer.setupRefund().toJSON();
    console.log(payload);
    this.connection.send({
      type: 'sign',
      payload: payload
    });
  };

  StreamiumClient.prototype.end = function() {
    clearInterval(this.interval);
    this.connection.send({
      type: 'end',
      payload: this.consumer.paymentTx.toJSON()
    });
  };

  return new StreamiumClient();
});
