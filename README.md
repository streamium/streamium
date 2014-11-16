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
python -m "SimpleHTTPServer"
```

and then access it from any [WebRTC-supporting](http://www.webrtc.org/) browser:

http://localhost:8000/

## Technology stack

### Static web application
Streamium is a static HTML web application and thus requires no servers to run.

### AngularJS
AngularJS was used for client-side application code (and there's no server-side code!)

### WebRTC
WebRTC is a browser to browser communications protocol used to share video streams between
clients and service providers. It allows sharing of data and media without central servers.

### Bitcoin payment channels
Bitcoin is a p2p currency used for trustless payments. Bitcoin payment channels are used to establish
a secure pay-as-you-go mechanism which needs no third party to occur.

## License
Code released under the [MIT license](https://github.com/streamium/paystream/blob/master/LICENSE).

Copyright 2014 Streamium developers

