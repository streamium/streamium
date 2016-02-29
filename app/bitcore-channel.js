require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var $ = require('bitcore-lib').util.preconditions;

var Script = require('bitcore-lib').Script;
var Networks = require('bitcore-lib').Networks;
var PrivateKey = require('bitcore-lib').PrivateKey;
var PublicKey = require('bitcore-lib').PublicKey;
var Address = require('bitcore-lib').Address;
var _ = require('bitcore-lib').deps._;

var Commitment = require('./transactions/commitment');
var Payment = require('./transactions/payment');
var Refund = require('./transactions/refund');

var HOURS_IN_DAY = 24;
var MINUTES_IN_HOUR = 60;
var SECONDS_IN_MINUTE = 60;

var ONE_DAY = SECONDS_IN_MINUTE * MINUTES_IN_HOUR * HOURS_IN_DAY;

/**
 * @param {Object} opts
 * @param {string|Network} opts.network - 'livenet' or 'testnet'
 * @param {number} opts.expires - unix timestamp in millis since epoch
 *
 * @param {bitcore.PrivateKey=} opts.commitmentKey - key to use when negotiating the channel
 *
 * @param {string=} opts.providerPublicKey - the public key for the server, in hexa compressed format
 * @param {string=} opts.providerAddress - the final address where the server will be paid
 *
 * @param {bitcore.PrivateKey=} opts.fundingKey - key to use for funding the channel
 * @param {string=} opts.refundAddress - address to use for refund/change
 * @constructor
 */
function Consumer(opts) {
  /*jshint maxstatements: 30*/
  /*jshint maxcomplexity: 10*/
  opts = opts || {};

  /**
   * @type {bitcore.Network}
   * @desc Either 'livenet' or 'testnet'
   */
  this.network = Networks.get(opts.network || 'livenet');
  /**
   * @type number
   * @desc The expiration date for the channel, in seconds since UNIX epoch
   */
  this.expires = opts.expires || Math.round(new Date().getTime() / 1000) + ONE_DAY;

  /**
   * @type bitcore.PrivateKey
   * @desc This is the key used for the 2-of-2 locking of funds
   */
  this.commitmentKey = new PrivateKey(opts.commitmentKey);

  /**
   * @type {bitcore.PublicKey}
   */
  this.providerPublicKey = new PublicKey(opts.providerPublicKey);

  /**
   * @type {bitcore.Address|string}
   * @desc The address where the server will be paid.
   */
  this.providerAddress = opts.providerAddress ? new Address(opts.providerAddress) : this.providerPublicKey.toAddress();

  /**
   * @type bitcore.PrivateKey
   * @desc A private key for funding the channel. An alternative implementation could
   * provide a list of unspent outputs and the keys needed to sign the outputs
   */
  $.checkArgument(opts.fundingKey instanceof PrivateKey, 'fundingKey is expected to be a PrivateKey');
  this.fundingKey = opts.fundingKey;

  /**
   * @type bitcore.Address
   * @desc The address where the user will pay to fund the channel
   */
  this.fundingAddress = this.fundingKey.toAddress();

  if (opts.refundAddress instanceof Address) {
    /**
     * @type bitcore.Address
     * @desc The address where the refund will go to (also used for the change)
     */
    this.refundAddress = opts.refundAddress;
  } else {
    this.refundAddress = new Address(opts.refundAddress);
  }

  /**
   * @name Consumer#commitmentTx
   * @type Commitment
   * @desc The commitment transaction for this channel
   */
  this.commitmentTx = new Commitment({
    publicKeys: [this.commitmentKey.publicKey, this.providerPublicKey],
    network: this.network
  });
}

/**
 * Adds an UTXO to the funding transaction. The funding transaction exists
 * merely because we can't expect the wallet of the user to support payment
 * channels.
 *
 * @param {Object} utxo
 */
Consumer.prototype.processFunding = function(utxo) {
  $.checkArgument(_.isObject(utxo), 'Can only process an array of objects or an object');
  this.commitmentTx.from(utxo);
};

/**
 * Build the refund transaction (TX 2)
 *
 * @return {bitcore.Transaction}
 */
Consumer.prototype.setupRefund = function(relayOutput) {
  this.commitmentTx.sign(this.fundingKey);
  $.checkState(this.commitmentTx.isFullySigned());
  var amount = this.commitmentTx.amount - this.commitmentTx.getFee();
  var multisigOut = {
    txid: this.commitmentTx.id,
    outputIndex: 0,
    satoshis: amount,
    script: this.commitmentTx.outputs[0].script
  };
  this.refundTx = new Refund()
    .from(multisigOut, this.commitmentTx.publicKeys, 2);
  this.relayOutputAmount = 0
  if (relayOutput) {
    this.relayOutputAmount = relayOutput.amount
    this.relayOutput = relayOutput
    this.relayOutput.address = new Address(relayOutput.address)
    this.refundTx.to(this.refundAddress, this.refundTx.inputAmount - relayOutput.amount);
    this.refundTx.to(relayOutput.address, relayOutput.amount)
  } else {
    this.refundTx.to(this.refundAddress, this.refundTx.inputAmount);
  }
  this.refundTx.inputs[0].sequenceNumber = 0;
  this.refundTx.nLockTime = this.expires;
  return this.refundTx;
};

/**
 * Validates that a message contains a valid signature from the Provider
 * that allows the Consumer to spend the lock transaction (TX 1)
 *
 * @param {string} messageFromProvider JSON-serialized message
 * @return {boolean} true if the signature is valid
 */
Consumer.prototype.validateRefund = function(refund) {
  refund = new Refund(refund);
  refund.sign(this.commitmentKey);
  var receivedAddress = new Address(refund.outputs[0].script, this.network).toString();
  $.checkState(receivedAddress === this.refundAddress.toString());
  var amount = refund.outputs[0].satoshis;
  $.checkState(amount === this.commitmentTx.amount
               - this.commitmentTx.getFee()
               - this.relayOutputAmount,
    'Refund amount must equal commitmentTx amount');
  if (this.relayOutput) {
    $.checkState(new Address(refund.outputs[1].script, this.network).toString()
                 === this.relayOutput.address.toString(), 'Invalid relay output address')
    $.checkState(refund.outputs[1].satoshis === this.relayOutputAmount,
                 'Refund amount must equal commitmentTx amount');
  }
  $.checkState(refund.outputs.length === 1 + (this.relayOutput ? 1 : 0),
               'More than expected outputs received');
  $.checkState(refund.isFullySigned(), 'Refund was not fully signed');
  $.checkState(Script.Interpreter().verify(
    refund.inputs[0].script,
    refund.inputs[0].output.script,
    refund,
    0,
    Script.Interpreter.SCRIPT_VERIFY_P2SH
    |
    Script.Interpreter.SCRIPT_VERIFY_STRICTENC
    |
    Script.Interpreter.SCRIPT_VERIFY_MINIMALDATA
    |
    Script.Interpreter.SCRIPT_VERIFY_SIGPUSHONLY
  ), 'Refund is incorrectly signed');
  this.refundTx = refund;
  var multisigOut = {
    txid: this.commitmentTx.hash,
    outputIndex: 0,
    satoshis: amount,
    script: this.commitmentTx.outputs[0].script
  };
  this.paymentTx = new Payment({
    multisigOut: multisigOut,
    amount: amount,
    paymentAddress: this.providerAddress,
    changeAddress: this.refundAddress,
    publicKeys: this.commitmentTx.publicKeys,
    network: this.network
  });
  this.paymentTx.sign(this.commitmentKey);
  return true;
};

/**
 * Increments the amount being paid by a given amount of satoshis.
 * @return {bitcore.Transaction} the updated transaction
 */
Consumer.prototype.incrementPaymentBy = function(satoshis) {
  this.paymentTx.updateValue(satoshis);
  this.paymentTx.sign(this.commitmentKey);
  return this.paymentTx.toObject();
};

/**
 * Idiomatic shortcut to retrieve the payment transaction.
 * @return {bitcore.Transaction}
 */
Consumer.prototype.getPaymentTx = function() {
  return this.paymentTx;
};

module.exports = Consumer;

},{"./transactions/commitment":4,"./transactions/payment":5,"./transactions/refund":6,"bitcore-lib":"bitcore-lib"}],2:[function(require,module,exports){
'use strict';

var spec = {
  name: 'Channel',
  message: 'Internal Error on bitcore-channels Module {0}',
};

module.exports = require('bitcore-lib').errors.extend(spec);

},{"bitcore-lib":"bitcore-lib"}],3:[function(require,module,exports){
'use strict';

var Payment = require('./transactions/payment');
var Refund = require('./transactions/refund');

var $ = require('bitcore-lib').util.preconditions;
var PrivateKey = require('bitcore-lib').PrivateKey;
var Script = require('bitcore-lib').Script;
var Address = require('bitcore-lib').Address;
var Networks = require('bitcore-lib').Networks;
var _ = require('bitcore-lib').deps._;

/**
 * @constructor
 */
function Provider(opts) {
  this.network = Networks.get(opts.network) || Networks.defaultNetwork;
  if (!opts.paymentAddress) {
    this.paymentKey = new PrivateKey();
    this.paymentAddress = this.paymentKey.toAddress(this.network);
  } else {
    this.paymentAddress = new Address(opts.paymentAddress);
  }

  this.currentAmount = opts.currentAmount || 0;
  this.key = opts.key || new PrivateKey();
}

Provider.prototype.getPublicKey = function getPublicKey() {
  return this.key.publicKey;
};

Provider.prototype.signRefund = function signRefund(receivedData) {
  var refund = new Refund(receivedData);
  refund.sign(this.key);
  this.refund = refund;
  return refund;
};

Provider.prototype.validPayment = function validPayment(receivedData) {
  var payment = new Payment(receivedData);
  var newAmount;
  var self = this;

  payment.sign(this.key);
  payment.outputs.map(function(output) {
    if (output.script.toAddress(self.network).toString() === self.paymentAddress.toString()) {
      newAmount = output.satoshis;
    }
  });
  $.checkState(!_.isUndefined(newAmount), 'No output found corresponding to paymentAddress');
  $.checkState(Script.Interpreter().verify(
    payment.inputs[0].script,
    payment.inputs[0].output.script,
    payment,
    0,
    Script.Interpreter.SCRIPT_VERIFY_P2SH
    |
    Script.Interpreter.SCRIPT_VERIFY_STRICTENC
    |
    Script.Interpreter.SCRIPT_VERIFY_MINIMALDATA
    |
    Script.Interpreter.SCRIPT_VERIFY_SIGPUSHONLY
  ), 'Script did not evaluate correctly (probably a bad signature received)');
  $.checkState(newAmount > this.currentAmount,
    'A payment for a greater amount was already received');
  this.paymentTx = payment;
  this.currentAmount = newAmount;
  return payment;
};

Provider.prototype.getPaymentTx = function getPaymentTx() {
  return this.paymentTx.build();
};

module.exports = Provider;

},{"./transactions/payment":5,"./transactions/refund":6,"bitcore-lib":"bitcore-lib"}],4:[function(require,module,exports){
'use strict';

var inherits = require('inherits');

var $ = require('bitcore-lib').util.preconditions;

var Script = require('bitcore-lib').Script;
var Transaction = require('bitcore-lib').Transaction;
var _ = require('bitcore-lib').deps._;


/**
 * A commitment transaction (also referred to as Lock transaction).
 *
 * @constructor
 * @param {Object} opts
 * @param {Array.<string>} opts.publicKeys
 * @param {string|bitcore.Network} opts.network - livenet by default
 */
function Commitment(opts) {
  $.checkArgument(opts.publicKeys && opts.publicKeys.length === 2, 'Must provide exactly two public keys');
  Transaction.call(this, opts.transaction);

  this.network = opts.network || 'livenet';
  this.publicKeys = opts.publicKeys;
  this.outscript = Script.buildMultisigOut(this.publicKeys, 2);
  this.address = this.outscript.toScriptHashOut().toAddress();
  if (!this.outputs.length) {
    this.change(this.address);
  }

  Object.defineProperty(this, 'amount', {
    configurable: false,
    get: function() {
      return this.inputAmount;
    }
  });
}
inherits(Commitment, Transaction);

Commitment.prototype.toJSON = function() {
  return JSON.stringify(this.toObject())
};

Commitment.prototype.toObject = function() {
  var transaction = Transaction.prototype.toObject.apply(this);
  return {
    transaction: transaction,
    publicKeys: _.map(this.publicKeys, function(publicKey) {
      return publicKey.toString();
    }),
    network: this.network.toString(),
  };
};

/**
 * @return {bitcore.Address}
 */
Commitment.prototype.getAddress = function() {
  return this.address;
};

module.exports = Commitment;

},{"bitcore-lib":"bitcore-lib","inherits":7}],5:[function(require,module,exports){
'use strict';

var inherits = require('inherits');

var Address = require('bitcore-lib').Address;
var Transaction = require('bitcore-lib').Transaction;
var PublicKey = require('bitcore-lib').Publickey;
var $ = require('bitcore-lib').util.preconditions;
var _ = require('bitcore-lib').deps._;

var FEE_AMOUNT = 10000;


/**
 * @constructor
 * @param {Object} opts
 * @param {bitcore.PublicKey} opts.publicKeys
 * @param {bitcore.Address} opts.paymentAddress
 * @param {bitcore.Address} opts.changeAddress
 */
function Payment(opts) {
  if (!(this instanceof Payment)) {
    return new Payment(opts);
  }
  Transaction.call(this, opts.transaction);

  this.paymentAddress = new Address(opts.paymentAddress);
  this.changeAddress = new Address(opts.changeAddress);
  if (!this.outputs.length) {
    this.change(this.changeAddress);
  }

  this.multisigOut = new Transaction.UnspentOutput(opts.multisigOut);
  this.publicKeys = _.map(opts.publicKeys, PublicKey);
  if (!this.inputs.length) {
    this.from(this.multisigOut, this.publicKeys, 2);
  }
  this.amount = this.outputAmount;
  this.sequence = opts.sequence || 0;
  this.paid = opts.paid || 0;
  $.checkArgument(_.isNumber(this.amount), 'Amount must be a number');
}
inherits(Payment, Transaction);

Payment.prototype._updateTransaction = function() {
  this.clearOutputs();
  this.to(this.paymentAddress, this.paid);
  this.inputs[0].sequence = this.sequence;
};

Payment.prototype.updateValue = function(delta) {
  this.paid += delta;
  this.sequence += 1;
  this._updateTransaction();
  return this;
};

Payment.prototype.toJSON = function() {
  return JSON.stringify(this.toObject());
};

Payment.prototype.toObject = function() {
  return {
    publicKeys: _.map(this.publicKeys, function(publicKey) {
      return publicKey.toString();
    }),
    multisigOut: this.multisigOut.toObject(),
    amount: this.amount,
    sequence: this.sequence,
    paymentAddress: this.paymentAddress.toString(),
    changeAddress: this.changeAddress.toString(),
    transaction: Transaction.prototype.toObject.apply(this)
  };
};

Payment.fromObject = function(obj) {
  return new Payment(obj);
};

module.exports = Payment;

},{"bitcore-lib":"bitcore-lib","inherits":7}],6:[function(require,module,exports){
'use strict';

var inherits = require('inherits');

var Transaction = require('bitcore-lib').Transaction;

/**
 * @constructor
 */
function Refund() {
  Transaction.apply(this, arguments);
}
inherits(Refund, Transaction);

module.exports = Refund;

},{"bitcore-lib":"bitcore-lib","inherits":7}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],"bitcore-channel":[function(require,module,exports){
// Setup errors
require('./lib/errors');

module.exports = {
  Consumer: require('./lib/consumer'),
  Provider: require('./lib/provider'),
  Transactions: {
    Commitment: require('./lib/transactions/commitment'),
    Refund: require('./lib/transactions/refund'),
    Payment: require('./lib/transactions/payment')
  }
};

},{"./lib/consumer":1,"./lib/errors":2,"./lib/provider":3,"./lib/transactions/commitment":4,"./lib/transactions/payment":5,"./lib/transactions/refund":6}]},{},[]);
