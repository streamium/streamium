'use strict';

var express = require('express');
var app = express();

// This routes enables HTML5Mode by forwarding missing files to the index.html
app.configure(function(){

  // Livenet
  app.all('/b/*', function(req, res) {
    res.sendfile('./index.html');
  });

  app.all('/s/*', function(req, res) {
    res.sendfile('./index.html');
  });

  app.use('/', express.static('.'));


  // Testnet
  app.all('/t/b/*', function(req, res) {
    res.sendfile('./testnet/index.html');
  });

  app.all('/t/s/*', function(req, res) {
    res.sendfile('./testnet/index.html');
  });

  app.use('/t', express.static('./testnet'));

  app.use('/tutorial-address', express.static('.'));

});

var port = 8000;
app.listen(port, function() {
  console.log('Server listening on port', port);
});
