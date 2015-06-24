'use strict';

angular.module('streamium.provider.controller', ['ngRoute'])

.config(['$routeProvider',
  function($routeProvider) {

    var create = {
      templateUrl: '/app/provider/create.html',
      controller: 'CreateStreamCtrl'
    };
    $routeProvider.when('/', create);
    $routeProvider.when('/t', create);

    var screen = {
      templateUrl: '/app/provider/empty.html',
      controller: 'ScreenCtrl'
    };
    $routeProvider.when('/screen', screen);
    $routeProvider.when('/t/screen', screen);

    var broadcast = {
      templateUrl: '/app/provider/stream.html',
      controller: 'BroadcastStreamCtrl'
    };
    $routeProvider.when('/b/:streamId', broadcast);
    $routeProvider.when('/t/b/:streamId', broadcast);

    var cashout = {
      templateUrl: '/app/provider/cashout.html',
      controller: 'CashoutStreamCtrl'
    };
    $routeProvider.when('/b/:streamId/cashout', cashout);
    $routeProvider.when('/t/b/:streamId/cashout', cashout);
    var tutorial = {
      address: {
        templateUrl: '/app/provider/tutorial-address.html',
        controller: 'CashoutStreamCtrl'
      }
    };
    $routeProvider.when('/tutorial-address', tutorial.address);
  }
])

.controller('ScreenCtrl', function($rootScope, $location) {
  $rootScope.screen = true;

  $location.path(config.appPrefix);
})

.controller('CreateStreamCtrl', function($rootScope, $scope, $location, Rates, StreamiumProvider, bitcore, Insight, Stats) {
  $scope.stream = {};

  jQueryBackup('[data-toggle="tooltip"]').tooltip();
  var storedStream = JSON.parse(localStorage.getItem('providerInfo') || '{}');

  $scope.stream.name = storedStream.name || (config.DEBUG ? config.defaults.providerStream : '');
  $scope.stream.address = storedStream.address || (config.DEBUG ? config.defaults.providerAddress : '');
  $scope.stream.rate = storedStream.rate || 60;

  $scope.stream.error = null;
  $scope.stream.loading = false;

  $scope.config = config;
  $scope.otherNetwork = config.otherNetwork;
  $scope.linkToOther = config.linkToOther;

  if (!DetectRTC.isWebRTCSupported) {
    $scope.nowebrtc = true;
  }

  $scope.normalizeName = function() {
    var name = $scope.stream.name || '';
    name = name.trim().toLowerCase().replace(/ |\\/g, '-');
    $scope.stream.name = name;
  };

  $scope.usdHourToBtcSec = function(usdHour) {
    if (!Rates.rate) {
      return 0;
    }
    var usdSecond = usdHour / 3600;
    var btcSecond = bitcore.Unit.fromFiat(usdSecond, Rates.rate).toBTC();
    return btcSecond ? btcSecond : 0;
  };

  $scope.usdHourToBtcMin = function(usdHour) {
    if (!Rates.rate) {
      return 0;
    }
    var usdSecond = usdHour / 60;
    var btcSecond = bitcore.Unit.fromFiat(usdSecond, Rates.rate).toBTC();
    return btcSecond ? btcSecond : 0;
  };
  Stats.homepage();

  $scope.switchNetwork = function() {
    window.location = window.location.origin + config.linkToOther;
  };

  jQueryBackup(function() {
    retrievePendingTxs(Insight);
  });

  $scope.submit = function() {
    if (!$scope.form.$valid) {
      return;
    }

    var priceRate = $scope.usdHourToBtcMin($scope.stream.rate);

    if (priceRate <= 0) {
      $scope.stream.error = 'Price rate must be a positive number';
      return;
    }

    $scope.stream.loading = true;
    Stats.provider.createdStream(priceRate, $scope.stream.name, $scope.stream.address);
    StreamiumProvider.init(
      $scope.stream.name,
      $scope.stream.address,
      priceRate,
      function onCreate(err) {
        $scope.stream.loading = false;

        if (err === StreamiumProvider.ERROR.UNREACHABLE) {
          $scope.stream.error = 'Sorry, we\'re unable to start the stream right now. Mind trying again later?';
        } else if (err === StreamiumProvider.ERROR.IDISTAKEN) {
          $scope.stream.error = 'Looks like that channel name is already taken. Mind trying a different one?';
        } else if (err === null) {
          localStorage.setItem('providerInfo', JSON.stringify({
            name: $scope.stream.name,
            address: $scope.stream.address,
            rate: $scope.stream.rate
          }));
          $location.path(config.appPrefix + '/b/' + $scope.stream.name);
        } else {
          console.log(err);
        }

        $scope.$apply();
      }
    );
  };
})

.controller('BroadcastStreamCtrl', function($rootScope, $scope, $location, $routeParams, video, StreamiumProvider, Stats) {
  $scope.PROVIDER_COLOR = config.PROVIDER_COLOR;
  $scope.name = $routeParams.streamId;
  $scope.requiresApproval = true;

  $scope.isChrome = !!navigator.webkitGetUserMedia;
  $scope.isFirefox = !!navigator.mozGetUserMedia;
  $scope.screen = $rootScope.screen;

  $scope.peers = {};
  $scope.message = '';
  $scope.messages = [];
  var started = new Date();

  $scope.switchScreen = function(ev) {
    Stats.provider.castingScreen($scope.name, StreamiumProvider.address.toString());
    $rootScope.switched = true;
    $scope.screen = $rootScope.screen = !$rootScope.screen;
    $scope.requiresApproval = true;
    video.finish();
    startCamera();
    return false;
  };

  StreamiumProvider.on('broadcast:start', function(peer) {
    console.log('Start broadcast for ' + peer);
    $scope.peers[peer] = peer;
    Stats.provider.clientJoined({
      delayToJoin: (new Date().getTime() - started.getTime()) / 1000
    });
    video.broadcast(peer, function(err) {
      if (err) throw err;
      $scope.broadcasting = true;
      $scope.$apply();
    });
  });

  StreamiumProvider.on('broadcast:end', function(peer) {
    if ($scope.peers[peer]) {
      delete $scope.peers[peer];
      video.end(peer);
    }
    $scope.$apply();
  });

  StreamiumProvider.on('chatroom:message', function(data) {

    Stats.provider.chatMessage();
    $scope.messages.push({
      color: data.color,
      text: data.message
    });

    if (data.color) $scope.$apply(); // Only for clients
  });

  StreamiumProvider.on('balanceUpdated', function() {
    $scope.$apply();
  });

  $scope.end = function() {
    StreamiumProvider.endAllBroadcasts();
    $location.path(config.appPrefix + '/b/' + $routeParams.streamId + '/cashout');
  };

  $scope.chat = function() {
    StreamiumProvider.sendMessage($scope.message);
    $scope.message = '';
  };

  var startCamera = function() {
    $scope.client = StreamiumProvider;
    $scope.filming = true;
    video.setPeer(StreamiumProvider.peer);
    video.camera(!!$rootScope.screen, function(err, stream) {
      if (err) {
        console.log('error starting video:', err);
        return;
      }

      $scope.requiresApproval = false;
      $scope.videoSrc = URL.createObjectURL(stream);
      $scope.$digest();
    });
  };

  if (!StreamiumProvider.streamId && !config.DEBUG) {
    $location.path(config.appPrefix + '/');
    return;
  } else if (!StreamiumProvider.streamId && config.DEBUG) {
    StreamiumProvider.init(config.defaults.providerStream, 'n3vNjpQB8GUVNz5R2hSM8rq4EgMEQqS4AZ', 0.001, function(err) {
      if (err) {
        console.log(err);
        return;
      }
      startCamera();
    });
  } else {
    startCamera();
  }

  window.addEventListener('beforeunload', dontClose);
})

.controller('CashoutStreamCtrl', function($rootScope, StreamiumProvider, $location, Duration, $scope, bitcore, Stats) {

  window.removeEventListener('beforeunload', dontClose);

  $scope.client = StreamiumProvider;
  $scope.totalMoney = 0;
  $scope.clients = [];
  for (var i in $scope.client.mapClientIdToProvider) {
    var amount = $scope.client.mapClientIdToProvider[i].currentAmount;
    var time = Duration.for(StreamiumProvider.rate, amount);
    $scope.totalMoney += amount;
    if (amount > 0) {
      var txId = $scope.client.mapClientIdToProvider[i].paymentTx.id;
      $scope.clients.push({
        amount: amount,
        timeSpent: time / 1000,
        transactionName: txId.substr(0, 4) + '...' + txId.substr(60, 64),
        transactionUrl:  'https://'
          + (bitcore.Networks.defaultNetwork.name === 'testnet' ? 'test-' : '')
          + 'insight.bitpay.com/tx/' + txId
      });
    }
  }
  Stats.provider.endedStream({
    name: StreamiumProvider.name,
    totalEarned: $scope.totalMoney,
    totalTime: Duration.for(StreamiumProvider.rate, $scope.totalMoney) / 1000,
    rate: StreamiumProvider.rate,
    maxActive: StreamiumProvider.clientMaxActive,
    screen: $rootScope.screen,
    totalClients: StreamiumProvider.clientConnections.length
  });
})
.directive('twitter',
  function($timeout) {
    return {
      link: function(scope, element, attr) {
        $timeout(function() {
          if (twttr && twttr.widgets) {
            twttr.widgets.createShareButton(
              attr.url,
              element[0],
              function(el) {}, {
                count: 'none',
                text: attr.text
              }
            );
          }
        });
      }
    }
  }
);

function retrievePendingTxs(Insight) {

  var $ = jQueryBackup;
  var broadcast = [];
  var messages = [];
  var i, txraw, parts, name, time, peerid;
  for (i in localStorage) {
    parts = i.split('_');
    if (parts.length !== 3) {
      continue;
    }
    txraw = localStorage.getItem(i);
    if (i.indexOf('payment_') === 0) {
      broadcast.push({
        key: i,
        name: parts[1],
        tx: txraw,
        peerid: parts[2]
      });
    }
    if (i.indexOf('refund') === 0) {
      name = parts[1];
      time = parts[2];
      if (time < new Date().getTime() / 1000) {
        broadcast.push({
          key: i,
          name: parts[1],
          tx: txraw,
          time: parts[2]
        });
      } else {
        messages.push(parts[1]);
      }
    }
  }
  /*
  if (messages.length === 1) {
    var msg = 'You have locked funds from the stream "' + messages[0] + '". Come back tomorrow to try to claim them!';
    $('.top-right').notify({ message: msg}).show();
  } else if (messages.length > 1) {
    var msg = 'You have locked funds from the streams "' +
      messages.join('", "') + '". Come back tomorrow to try to claim them!';
    $('.top-right').notify({ message: msg}).show();
  }
  */
  broadcast.map(function(tx) {
    Insight.broadcast(tx.tx, function(err, txid) {
      if (err) {
        if (tx.time) {
          localStorage.removeItem(tx.key);
        }
        console.log('Could not broadcast transaction', broadcast[i]);
        return;
      }
      var msg = 'Unclaimed funds from the stream "' + tx.name + '" were just sent to you. Check your wallet!';
      $('.top-right').notify({
        message: msg
      }).show();
      localStorage.removeItem(tx.key);
    });
  });
}

var dontClose = function(e) {
  var e = e || window.event;
  var question = 'This will end the broadcast';

  if (e) {
    e.returnValue = question;
  }
  return question;
};
