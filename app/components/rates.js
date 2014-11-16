'use strict';

angular.module('streamium.rates', [])

.service('Rates', function($http) {
  
  function RateService () {
    this.rate = 0;

    var self = this;
    $http.get('https://bitpay.com/api/rates/usd').success(function(data) {
      self.rate = data.rate;
    });
  };

  return new RateService();
})

.filter('USD2BTC', function(Rates) {
  return function(usd) {
    if (!Rates.rate) return '0 BTC';
    return (usd / Rates.rate).toFixed(8) + ' BTC';
  };
});
