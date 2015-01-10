Streamium
=========

Decentralized trustless video streaming using bitcoin payment channels


## Concept

Streamium is a fully decentralized paid video streaming application. It leverages 
various prior technologies like bitcoin and WebRTC to achieve trustless pay-as-you-go
video streaming with no intermediaries. 

Content creators offer their streaming services in exchange for bitcoins using 
a payment channel with the client, streaming a series of cost-free transactions
with no counterparty risk.

## Installation

To run Streamium, just serve the root directory using any web server.
For example:
```
cd paystream/
bower install
python -m "SimpleHTTPServer"
```

and then access it from any [WebRTC-supporting](http://www.webrtc.org/) browser:

http://localhost:8000/

## Technology stack

### Static web application
Streamium is a static HTML web application and thus requires no servers to run.

### AngularJS
[AngularJS](https://angularjs.org/) was used for client-side application code (and there's no server-side code!)

### WebRTC
[WebRTC](http://www.webrtc.org/) is a browser to browser communications protocol used to share video streams between
clients and service providers. It allows sharing of data and media without central servers. We use [PeerJS](http://peerjs.com/)
to manage WebRTC connections.

### Bitcoin payment channels
Bitcoin is a p2p currency used for trustless payments.
[Bitcoin payment channels](https://bitcoin.org/en/developer-guide#micropayment-channel) are used to establish
a secure pay-as-you-go mechanism with no need for a third party.

## License
Code released under the [MIT license](https://github.com/streamium/paystream/blob/master/LICENSE).

Copyright 2014 Streamium developers

