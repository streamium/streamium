'use strict';

var _ = require('lodash');
var inherits = require('inherits');

var $ = require('bitcore').util.preconditions;

var PrivateKey = require('bitcore').PrivateKey;
var Address = require('bitcore').Address;
var Script = require('bitcore').Script;
var Transaction = require('bitcore').Transaction;


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
  this.address = Address(this.outscript, this.network);
  this.change(this.address);

  this.keys = opts.keys ? _.map(opts.keys, function(privateKey) { return new PrivateKey(privateKey); }) : [];
  Object.defineProperty(this, 'amount', {
    configurable: false,
    get: function() {
      return this._inputAmount;
    }
  });
  this._updateChange = undefined;
}
inherits(Commitment, Transaction);

Commitment.prototype.toObject = function() {
  var transaction = Transaction.prototype.toObject.apply(this);
  return {
    transaction: transaction,
    publicKeys: _.map(this.publicKeys, function(publicKey) { return publicKey.toString(); }),
    network: this.network.toString(),
    keys: _.map(this.keys, function(privateKey) { return privateKey.toString(); })
  };
};

/**
 * @return {bitcore.Address}
 */
Commitment.prototype.getAddress = function() {
  return this.address;
};

Commitment.prototype.addKey = function(key) {
  this.keys.push(key);
};

module.exports = Commitment;
