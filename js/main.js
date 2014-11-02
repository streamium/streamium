'use strict';


var room = window.location.hash;
room = room.substring(1);

if (room) {
  client(room);
} else {
  provider();
}

