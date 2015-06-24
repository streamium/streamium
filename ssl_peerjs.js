var fs = require('fs');
var PeerServer = require('peer').PeerServer;

var server = PeerServer({
  port: 9000,
  ssl: {
    key: fs.readFileSync('./ssl/server.key'),
    cert: fs.readFileSync('./ssl/server.crt')
  }
});
