'use strict';


var Video = function() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
};

Video.prototype.setPeer = function(peer) {
  this.peer = peer;
};

Video.prototype.camera = function(cb) {
  var self = this;
  navigator.getUserMedia({
    audio: true,
    video: true
  }, function(stream) {
    cb(null, stream);
    self.stream = stream;
  }, function() {
    cb('error acquiring video');
  });

};

Video.prototype.broadcast = function(connections, cb) {
  if (!this.peer) {
    cb('peer should be set');
    return;
  }
  console.log('broadcasting to ' + connections.length + ' clients');
  for (var i = 0; i < connections.length; i++) {
    var connection = connections[i];
    var call = this.peer.call(connection.peer, this.stream);
    var clientName = call.peer;
    call.on('close', function() {
      console.log('client ' + clientName + ' out of funds');
    });
  }
  cb(null);
};


Video.prototype.view = function(streamId, cb) {
  if (!this.peer) {
    cb('peer should be set');
    return;
  }
  this.peer.on('call', function(connection) {
    connection.answer();
    connection.on('stream', function(stream) {
      cb(null, stream);
    });
    connection.on('close', function() {
      cb('Media connection closed');
    });
    connection.on('error', function(error) {
      cb('Media connection error: ', error);
    });
  });
};

angular.module('streamium.video', [])
  .factory('video', function() {
    return new Video();
  });
