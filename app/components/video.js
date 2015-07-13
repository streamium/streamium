'use strict';

var Video = function() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  this.calls = {};
};

Video.prototype.setPeer = function(peer) {
  this.peer = peer;
};

Video.prototype.camera = function(type, cb) {
  var self = this;

  if (type === 'webcam') {
    navigator.getUserMedia(config.userMedia, function(stream) {
      self.stream = stream;
      cb(null, stream);
    }, function() {
      cb('error acquiring video');
    });

  } else if (type === 'screen') {

    getScreenId(function (error, sourceId, screen_constraints) {
      if (error) {
        if (error === 'permission-denied') {
          alert('Please allow Streamium to broadcast');
        } else if (error === 'not-installed') {
          alert('Please install the extensions needed for Streamium to work');
        } else if (error === 'installed-disabled') {
          alert('The extension is disabled! Streamium can\'t work without it');
        } else if (sourceId !== 'firefox') {
          alert('Improve your experience by using Chrome!');
        }
        return cb('error acquiring video');
      }

      if (sourceId && sourceId !== 'firefox') {
        screen_constraints = {
          video: {
            mandatory: {
              chromeMediaSource: 'screen',
              maxWidth: 1920,
              maxHeight: 1080,
              minAspectRatio: 1.77
            }
          }
        };

        if (sourceId) {
          screen_constraints.video.mandatory.chromeMediaSource = 'desktop';
          screen_constraints.video.mandatory.chromeMediaSourceId = sourceId;
        }
      }

      navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
      navigator.getUserMedia(screen_constraints, function (stream) {
        self.stream = stream;
        cb(null, stream);
      }, function (error) {
        cb('error acquiring video');
      });
    });
  } else {
    cb('Type of stream not set');
  }
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

Video.prototype.finish = function() {
  try {
    video.stream.end();
  } catch (e) {
  }
  try {
    video.stream.close();
  } catch (e) {
  }
  try {
    video.stream.stop();
  } catch (e) {
  }
};

Video.prototype.end = function(peer) {

  if (this.calls[peer]) {
    this.calls[peer].close();
    delete this.calls[peer];
  } else {
    console.log('trying to end call from already closed peer', peer);
  }
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
