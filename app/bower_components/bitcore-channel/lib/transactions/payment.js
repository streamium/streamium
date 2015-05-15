'use strict';

var _ = require('lodash');
var inherits = require('inherits');

var Address = require('bitcore').Address;
var Transaction = require('bitcore').Transaction;
var PublicKey = require('bitcore').Publickey;
var $ = require('bitcore').util.preconditions;

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
  this._change = new Address(opts.changeAddress);

  this.multisigOut = new Transaction.UnspentOutput(opts.multisigOut);
  this.publicKeys = _.map(opts.publicKeys, PublicKey);
  if (!this.inputs.length) {
    this.from(this.multisigOut, this.publicKeys, 2);
  }
  if (this.outputs.length < 2) {
    this._updateChangeOutput();
  }
  this.amount = this._outputAmount;
  this.sequence = opts.sequence || 0;
  this._fee = FEE_AMOUNT;
  this.paid = opts.paid || 0;
  $.checkArgument(_.isNumber(this.amount), 'Amount must be a number');
  this._changeSetup = undefined;
}
inherits(Payment, Transaction);

Payment.prototype._updateTransaction = function() {
  this.outputs = [];
  this._changeOutput = undefined;
  this._outputAmount = 0;
  this.to(this.paymentAddress, this.paid);
  this.inputs[0].sequence = this.sequence;
  this._changeSetup = false;
};

Payment.prototype.updateValue = function(delta) {
  this.paid += delta;
  this.sequence += 1;
  this._updateTransaction();
  return this;
};

Payment.prototype.toObject = function() {
  return {
    publicKeys: _.map(this.publicKeys, function(publicKey) { return publicKey.toString(); }),
    multisigOut: this.multisigOut.toObject(),
    amount: this.amount,
    sequence: this.sequence,
    paymentAddress: this.paymentAddress.toString(),
    changeAddress: this._change.toString(),
    transaction: Transaction.prototype.toObject.apply(this)
  };
};

Payment.fromObject = function(obj) {
  return new Payment(obj);
};

module.exports = Payment;
