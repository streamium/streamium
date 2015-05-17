'use strict';

angular.module('streamium.provider.controller', ['ngRoute'])

.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/provider', {
      templateUrl: 'provider/create.html',
      controller: 'CreateStreamCtrl'
    });

    $routeProvider.when('/provider/:streamId', {
      templateUrl: 'provider/stream.html',
      controller: 'BroadcastStreamCtrl'
    });

    $routeProvider.when('/provider/:streamId/cashout', {
      templateUrl: 'provider/cashout.html',
      controller: 'CashoutStreamCtrl'
    });
  }
])

.controller('CreateStreamCtrl', function($scope, $location, StreamiumProvider, bitcore) {
  $scope.prices = [0.5, 0.1, 0.01, 0.001, 0.0001];
  $scope.stream = {};

  $scope.stream.name = config.DEBUG ? config.defaults.providerStream : '';
  $scope.stream.address = config.DEBUG ? config.defaults.providerAddress : '';
  $scope.stream.rate = config.DEBUG ? config.defaults.providerRate : 0.001;;

  $scope.stream.error = null;
  $scope.stream.loading = false;

  $scope.normalizeName = function() {
    var name = $scope.stream.name || '';
    name = name.trim().toLowerCase().replace(/ |\\/g, '-');
    $scope.stream.name = name;
  };

  $scope.submit = function() {
    if (!$scope.form.$valid) return;
    $scope.stream.loading = true;
    StreamiumProvider.init(
      $scope.stream.name,
      $scope.stream.address,
      $scope.stream.rate,
      function onCreate(err, done) {
        $scope.stream.loading = false;
        if (err) {
          $scope.stream.error = "Channel name is taken, please pick a different one";
        } else {
          $location.path('/provider/' + $scope.stream.name);
        }

        $scope.$apply();
      });
  };
})

.controller('BroadcastStreamCtrl', function($scope, $location, $routeParams, video, StreamiumProvider) {
  var name = $location.$$url.split('/')[2];
  $scope.requiresApproval = true;

  $scope.peers = {};

  StreamiumProvider.on('broadcast:start', function(peer) {
    console.log('Start broadcast for ' + peer);
    $scope.peers[peer] = peer;
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

  StreamiumProvider.on('balanceUpdated', function() {
    $scope.$apply();
  });

  $scope.end = function() {
    StreamiumProvider.endAllBroadcasts();
    $location.path('/provider/' + $routeParams.streamId + '/cashout');
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
  if (!StreamiumProvider.streamId) {
    // TODO: remove this
    StreamiumProvider.init(name, 'n3vNjpQB8GUVNz5R2hSM8rq4EgMEQqS4AZ', 0.001, function(err) {
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
});
