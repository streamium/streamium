'use strict';

var RATE = null;
var FEE  = null;

var NAME_VALID = false;
var ADDRESS_VALID = false;

function updatePrice() {
  if (!RATE) return;
  var dollars = parseFloat($('#price').val());
  var FEE = parseFloat((dollars / RATE).toFixed(8));
  $('#btc').val(FEE + " BTC/min");
}

function checkValidName() {
  var name = $('#name').val().trim();
  name = name.toLowerCase().replace(/ /g, '-').replace(/\\/g, '-');

  $('#name').val(name);
  $('#name').siblings('span').toggleClass('hide', false);
  $('#name').parent().parent().toggleClass('has-success', true);
  NAME_VALID = true;

  checkFormValid();
}

function checkValidAddress() {
  var bitcore = require('bitcore');
  var address = new bitcore.Address($('#address').val());
  ADDRESS_VALID = address.isValid();

  $('#address').siblings('span').toggleClass('hide', false);

  var colorClass = ADDRESS_VALID ? 'has-success' : 'has-error';
  var iconClass = ADDRESS_VALID ? 'glyphicon-ok' : 'glyphicon-remove';

  $('#address').parent().removeClass('has-success').removeClass('has-error');
  $('#address').parent().addClass(colorClass);

  $('#address').siblings('span').toggleClass('hide', false);
  $('#address').siblings('span').removeClass('glyphicon-ok').removeClass('glyphicon-remove');
  $('#address').siblings('span').addClass(iconClass);

  checkFormValid();
}

function checkFormValid() {
  var isValid = NAME_VALID && ADDRESS_VALID;
  $('#create-room').prop("disabled", !isValid);
}

function setHomeListeners() {
  $('#price').change(updatePrice);
  $('#name').change(checkValidName);
  $('#address').change(checkValidAddress);

  $.get('https://bitpay.com/api/rates/usd', function(price) {
    RATE = price.rate;
    updatePrice();
  });
}
