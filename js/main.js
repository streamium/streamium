'use strict';

$(function() {

  var room = window.location.hash.substring(1);




  if (room) {
    $('#client').removeClass('hide');
    client(room);
  } else {
    $('#home').removeClass('hide');
    //setHomeListeners();
    provider();
  }

});

