'use strict';

var inherits = require('inherits');

var Transaction = require('bitcore').Transaction;

/**
 * @constructor
 */
function Refund() {
  Transaction.apply(this, arguments);
  this._changeSetup = undefined;
}
inherits(Refund, Transaction);

module.exports = Refund;
