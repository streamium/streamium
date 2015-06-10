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
  }
])

.controller('CreateStreamCtrl', function($rootScope, $scope, $location, Rates, StreamiumProvider, bitcore, Insight) {
  $scope.stream = {};

  $scope.stream.name = config.DEBUG ? config.defaults.providerStream : '';
  $scope.stream.address = config.DEBUG ? config.defaults.providerAddress : '';
  $scope.stream.rate = 60;

  $scope.stream.error = null;
  $scope.stream.loading = false;

  $scope.config = config;
  $scope.otherNetwork = config.otherNetwork;
  $scope.linkToOther = config.linkToOther;

  if (!DetectRTC.isWebRTCSupported) {
    return $location.path('/no-webrtc');
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
  }

  $scope.usdHourToBtcMin = function(usdHour) {
    if (!Rates.rate) {
      return 0;
    }
    var usdSecond = usdHour / 60;
    var btcSecond = bitcore.Unit.fromFiat(usdSecond, Rates.rate).toBTC();
    return btcSecond ? btcSecond : 0;
  }
  config.analytics && mixpanel.track('homepage');

  $scope.switchNetwork = function() {
    window.location = window.location.origin + config.linkToOther;
  };

  jQueryBackup(function() {
    retrievePendingTxs(Insight);
  });

  $scope.submit = function() {
    if (!$scope.form.$valid) return;

    var priceRate = $scope.usdHourToBtcMin($scope.stream.rate);

    if (priceRate <= 0) {
      $scope.stream.error = "Price rate must be a positive number";
      return;
    }

    $scope.stream.loading = true;
    config.analytics && mixpanel.track('prov-created');
    StreamiumProvider.init(
      $scope.stream.name,
      $scope.stream.address,
      priceRate,
      function onCreate(err, done) {
        $scope.stream.loading = false;

        if (err === StreamiumProvider.ERROR.UNREACHABLE) {
          $scope.stream.error = 'Sorry, we\'re unable to start the stream right now. Mind trying again later?';
        } else if (err === StreamiumProvider.ERROR.IDISTAKEN) {
          $scope.stream.error = 'Looks like that channel name is already taken. Mind trying a different one?';
        } else if (err === null) {
          $location.path(config.appPrefix + '/b/' + $scope.stream.name);
        } else {
          console.log(err);
        }

        $scope.$apply();
      });
  };
})

.controller('BroadcastStreamCtrl', function($scope, $location, $routeParams, video, StreamiumProvider) {
  $scope.name = $routeParams.$streamId;
  $scope.requiresApproval = true;

  $scope.peers = {};
  $scope.message = "";
  $scope.messages = [];

  StreamiumProvider.on('broadcast:start', function(peer) {
    console.log('Start broadcast for ' + peer);
    $scope.peers[peer] = peer;
    config.analytics && mixpanel.track('prov-started');
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

  $scope.chat = function () {
    StreamiumProvider.sendMessage($scope.message);
    $scope.message = '';
  };

  var startCamera = function() {
    $scope.client = StreamiumProvider;
    $scope.filming = true;
    video.setPeer(StreamiumProvider.peer);
    video.camera(function(err, stream) {
      if (err) {
        console.log(err);
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

})

.controller('CashoutStreamCtrl', function(StreamiumProvider, $location, Duration, $scope, bitcore) {
  $scope.client = StreamiumProvider;
  $scope.totalMoney = 0;
  $scope.clients = [];
  config.analytics && mixpanel.track('prov-end');
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
  if (messages.length === 1) {
    var msg = 'You have locked funds from the stream "' + messages[0] + '". Come back tomorrow to try to claim them!';
    $('.top-right').notify({ message: msg}).show();
  } else if (messages.length > 1) {
    var msg = 'You have locked funds from the streams "' + messages.join('", "') + '". Come back tomorrow to try to claim them!';
    $('.top-right').notify({ message: msg}).show();
  }
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
      $('.top-right').notify({ message: msg}).show();
      localStorage.removeItem(tx.key);
    });
  });
}
