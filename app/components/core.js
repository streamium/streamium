'use strict';

angular.module('streamium.core', [])

.service('StreamiumProvider', function(bitcore) {

  function StreamiumProvider (streamId, address, rate) {
    this.address = this.streamId = this.rate = null;
    this.status = this.STATUS.disconnected;

    this.config = {
      key: 'lwjd5qra8257b9',
      debug: 0,
      config: {
        'iceServers': [{
          url: 'stun:stun.l.google.com:19302'
        }]
      }
    };

  };

  StreamiumProvider.prototype.STATUS = {
    disconnected  : 'disconnected',
    connecting    : 'connecting',
    ready         : 'ready',
    finished      : 'finished'
  };

  StreamiumProvider.prototype.init = function(streamId, address, rate, cb) {
    if (!streamId || !address || !rate || !cb) return cb('Invalid arguments');

    var address = new bitcore.Address(address);
    if (!address.isValid()) return cb('Invalid address');

    this.status = this.STATUS.connecting;

    this.streamId = streamId;
    this.address = address;
    this.rate = rate;


    this.peer = new Peer(this.streamId, this.config);
    var self = this;
    this.peer.on('open', function onOpen() {
      self.status = self.STATUS.ready;
    });

    this.peer.on('close', function onClose() {
      self.status = self.STATUS.finished;
    });

    this.peer.on('error', function onError(error) {
      self.status = self.STATUS.disconnected;
      cb(error);
    });

    this.peer.on('connection', function onConnection(connection) {
      console.log('Connection!');
      // TODO:
    });

    // Init Provider
    // Change status
  };

  StreamiumProvider.prototype.getLink = function() {
    if (this.status == this.STATUS.disconnected) throw 'Invalid State';
    return 'https://streamium.io/join/' + this.streamId;
  }

  return new StreamiumProvider();
})

.service('StreamiumClient', function() {
  
  function StreamiumClient (streamId, address) {
    this.address = address;
    this.streamId = streamId;
  };

  return new StreamiumClient();
});
