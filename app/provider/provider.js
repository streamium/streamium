'use strict';

angular.module('streamium.provider.service', [])

.service('StreamiumProvider', function(bitcore, channel, events, inherits, Insight, Duration) {
  var Provider = channel.Provider;

  var SECONDS_IN_MINUTE = 60;
  var MILLIS_IN_SECOND = 1000;
  var MILLIS_IN_MINUTE = MILLIS_IN_SECOND * SECONDS_IN_MINUTE;

  function StreamiumProvider() {
    this.network = bitcore.Networks.get(config.network);
    bitcore.Networks.defaultNetwork = this.network;

    this.address = this.streamId = this.rate = null;

    // TODO: this screams for a status object or add status into Provider
    this.totalMoney = 0;
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
    this.clientConnectionMap = {};

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
      self.clientConnectionMap[connection.peer] = connection;

      connection.on('data', function(data) {
        console.log('New message:', data);
        if (!data.type || !self.handlers[data.type]) throw 'Kernel panic'; // TODO!
        self.handlers[data.type].call(self, connection, data.payload);
      });

      connection.on('error', function(error) {
        console.log('Error with peer connection', error);
        self.clientConnections.splice(self.clientConnections.indexOf(connection), 1);
        delete self.clientConnectionMap[connection.peer];
      });

      connection.on('close', function() {
        console.log('Client connection closed');
        self.clientConnections.splice(self.clientConnections.indexOf(connection), 1);
        delete self.clientConnectionMap[connection.peer];
      });
    });

    // Init Provider
    // Change status
  };

  StreamiumProvider.prototype.handlers = {};

  StreamiumProvider.prototype.handlers.hello = function(connection, data) {

    if (connection.peer in this.mapClientIdToProvider) {
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

    this.mapClientIdToStatus[connection.peer] = StreamiumProvider.STATUS.waiting;

    data = JSON.parse(data);
    provider.signRefund(data);
    var refund = provider.refund;

    connection.send({
      type: 'refundAck',
      payload: refund.toJSON()
    });
  };

  StreamiumProvider.prototype.endBroadcast = function(peerId) {
    this.mapClientIdToStatus[peerId] = StreamiumProvider.STATUS.finished;
    var payment = this.mapClientIdToProvider[peerId].paymentTx;
    var self = this;
    Insight.broadcast(payment.serialize(), function(err, txid) {
      if (err) {
        console.log('Error broadcasting ' + payment);
        console.log(err);
      } else {
        console.log('Payment broadcasted correctly', txid);
        var connection = self.clientConnectionMap[peerId];
        connection.send({
          type: 'end'
        });
      }
      self.emit('broadcast:end', peerId);
    });
  };

  StreamiumProvider.prototype.getFinalExpirationFor = function(provider) {
    return provider.startTime + Duration.for(this.rate, provider.refund.outputAmount);
  };

  StreamiumProvider.prototype.handlers.commitment = function(connection, data) {
    var commitment = new channel.Transactions.Commitment(JSON.parse(data));

    Insight.broadcast(commitment.serialize(), function(err, txid) {
      if (err) {
        console.log(err);
        this.emit('broadcast:end', connection);
      } else {
        console.log('Commitment tx broadcasted', txid);
      }
    });
  };

  StreamiumProvider.prototype.handlers.payment = function(connection, data) {

    var provider = this.mapClientIdToProvider[connection.peer];
    var status = this.mapClientIdToStatus[connection.peer];
    var firstPayment = false;

    if (status === StreamiumProvider.STATUS.waiting) {
      status = this.mapClientIdToStatus[connection.peer] = StreamiumProvider.STATUS.ready;
      firstPayment = true;
    }

    if (status !== StreamiumProvider.STATUS.ready) {
      console.log('Error: Received `payment` from a non-existing or unprepared peer:', data);
      return;
    }

    data = JSON.parse(data);
    provider.validPayment(data);
    var self = this;

    var updatePayment = function() {

      var refundExpiration = self.getFinalExpirationFor(provider);
      var paymentsExpiration = provider.startTime + Duration.for(self.rate, provider.currentAmount);
      var expiration = Math.min(refundExpiration, paymentsExpiration);

      clearTimeout(provider.timeout);
      provider.timeout = setTimeout(function() {
        console.log('Payment channel out of funds for ', connection.peer);
        self.endBroadcast(connection.peer);
      }, Math.min(expiration, refundExpiration) - new Date().getTime());

      console.log(connection.peer + ' expires at ' + new Date(expiration));
      // console.log('Current time is ' + new Date());
      // console.log('Funds will run out at ' + new Date(refundExpiration));

      self.totalMoney = 0;
      for (var providerId in self.mapClientIdToProvider) {
        self.totalMoney += self.mapClientIdToProvider[providerId].currentAmount;
      }

      self.emit('balanceUpdated', self.totalMoney);
      connection.send({
        type: 'paymentAck',
        payload: {
          success: true,
        }
      });
    };

    if (firstPayment) {
      return this.paymentVerification(data, function(err) {

        if (err) {
          console.log('Error accepting commitment:', err);
          return self.endBroadcast(connection.peer);
        }
        provider.startTime = new Date().getTime();
        updatePayment();

        self.emit('broadcast:start', connection.peer);
      });
    } else {
      updatePayment();
    }
  };

  StreamiumProvider.prototype.paymentVerification = function(data, callback) {

    var maxRetry = config.confidenceRetry;
    var targetConfidence = config.confidenceTarget;
    var retryDelay = config.confidenceDelay;
    var txid = data.transaction.inputs[0].prevTxId.toString('hex');
    var tryFetch = function(retry) {
      return function() {
        if (retry > maxRetry) {
          return callback(StreamiumProvider.ERROR.UNCONFIRMED);
        }
        $.ajax({
          url: config.BLOCKCYPHERTX + txid,
          dataType: 'json'
        }).done(function(confidence) {
          if (confidence.double_spend) {
            return callback(StreamiumProvider.ERROR.DOUBLESPEND);
          }
          if (confidence.confidence > targetConfidence) {
            return callback();
          }
          console.log('Confidence at '
                      + confidence.confidence
                      + '; waiting to reach ' + targetConfidence
          );
          return setTimeout(tryFetch(retry + 1), retryDelay);
        }).fail(function(err) {
          return setTimeout(tryFetch(retry + 1), retryDelay);
        });
      };
    };
    tryFetch(0)();
  };

  StreamiumProvider.prototype.endAllBroadcasts = function() {
    var self = this;
    async.map(_.keys(this.mapClientIdToProvider), function(client) {
      if (self.mapClientIdToStatus[client] === StreamiumProvider.STATUS.ready) {
        self.endBroadcast(client);
      }
    });
  };

  StreamiumProvider.prototype.getLink = function() {
    if (this.status === StreamiumProvider.STATUS.disconnected) throw 'Invalid State';
    var baseURL = window.location.origin;
    return baseURL + config.appPrefix + '/app/#/join/' + this.streamId;
  };

  StreamiumProvider.ERROR = {
    UNCONFIRMED: 'Unconfirmed',
    DOUBLESPEND: 'Double spend detected'
  };

  return new StreamiumProvider();
});
