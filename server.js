'use strict';

var fs = require('fs');
var https = require('https');
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

  app.all('/screen', function(req, res) {
    res.sendfile('./index.html');
  });
  app.all('/t/screen', function(req, res) {
    res.sendfile('./testnet/index.html');
  });
  app.all('/static', function(req, res) {
    res.sendfile('./index.html');
  });
  app.all('/t/static', function(req, res) {
    res.sendfile('./testnet/index.html');
  });

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

var port = 8443;

var secureServer = https.createServer({
  key: fs.readFileSync('./ssl/server.key'),
  cert: fs.readFileSync('./ssl/server.crt'),
  ca: fs.readFileSync('./ssl/ca.crt'),
  requestCert: true,
  rejectUnauthorized: false
}, app).listen(port, function() {
  console.log("Secure Express server listening on port " + port);
});
