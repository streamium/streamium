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
cd streamium/
bower install
python -m "SimpleHTTPServer"
```

and then access it from any [WebRTC-supporting](http://www.webrtc.org/) browser:

http://localhost:8000/

We suggest you provide a PeerJS server to your users (or at least [change the peerjs.org identifier](https://github.com/streamium/paystream/blob/master/app/config.js#L6))

## How does it work

### 1. Channel creation
  The user broadcasting creates a channel by specifying a name to use (this will be a unique identifier for the video stream). She needs to provide a payment address where the funds will eventually be sent to and the rate at which she expects the stream consumers to pay. She will receive a link to share with potential consumers of the stream.
### 2. Joining a channel
  For consumer users, the web application will join the channel by opening a peer to peer connection to the provider. The screen will show the rate the provider is charging, the provider's public key, and a funding address.
### 3. Funding process
  The consumer web application will generate a private key and show an address on screen so the user can fund the channel. After a transaction that adds funds to this address is detected, the payment channel is established by asking the server to sign the refund transaction and broadcasting the commitment transaction.
### 4. Video streaming
  When the server receives the commitment transaction and is ready to start broadcasting, the transmission of video to that user will start. The user will periodically transmit transactions signed by him to the server (like signing checks that will not be cashed) where each transaction gradually increments the amount paid to the server. When the user stops paying, or the connection is lost, the server will stop the transmission and broadcast the last payment received.

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

Copyright 2015 Streamium developers

