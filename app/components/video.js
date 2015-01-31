'use strict';


var Video = function() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  this.calls = {};
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

Video.prototype.broadcast = function(peer, cb) {
  if (!this.peer) {
    cb('peer should be set');
    return;
  }

  var call = this.peer.call(peer, this.stream);
  var clientName = call.peer;
  call.on('close', function() {
    console.log('client ' + clientName + ' out of funds');
  });
  this.calls[peer] = call;

  cb(null);
};

Video.prototype.end = function(connection) {
  connection.close();
  this.calls[connection.peer].close();
  delete this.calls[connection.peer];
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
