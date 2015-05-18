'use strict';

angular.module('streamium.rates', [])

.service('Rates', function($http) {

  function RateService() {
    this.rate = 0;

    var self = this;
    $http.get('https://bitpay.com/api/rates/usd').success(function(data) {
      self.rate = data.rate;
    });
  }

  return new RateService();
})

.filter('USD2BTC', function(Rates, bitcore) {
  return function(usd) {
    if (!Rates.rate) return '0 BTC';
    return bitcore.Unit.fromFiat(usd, Rates.rate).toBTC() + ' BTC';
  };
})

.filter('BTC2USD', function(Rates, bitcore) {
  return function(btc) {
    if (!Rates.rate) return '0 USD';
    var usd = bitcore.Unit.fromBTC(btc).atRate(Rates.rate);
    return usd;
  };
})

.filter('SATOSHIS2USD', function(Rates, bitcore) {
  return function(satoshis) {
    if (!Rates.rate) return '0 USD';
    var usd = bitcore.Unit.fromSatoshis(satoshis).atRate(Rates.rate);
    return usd;
  };
})

.filter('SATOSHIS2BTC', function(bitcore) {
  return function(satoshis) {
    var btc = bitcore.Unit.fromSatoshis(satoshis).toBTC();
    if (!btc) {
      return 0;
    }
    return btc;
  };
})

.directive('autoSelect', function() {
  return {
    link: function(scope, element, attrs) {
      $(element).click(function(){
        $(this).select();
      });
      element.attr('spellcheck', false);
    }
  };
});
