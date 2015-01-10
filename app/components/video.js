'use strict';


var Video = function() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
};


Video.prototype.init = function(cb) {
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

angular.module('streamium.video', [])
  .factory('video', function() {
    return new Video();
  });
