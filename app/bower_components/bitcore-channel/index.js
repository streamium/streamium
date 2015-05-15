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
