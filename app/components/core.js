'use strict';

var SECONDS_IN_MINUTE = 60;
var MILLIS_IN_SECOND = 1000;
var MILLIS_IN_MINUTE = MILLIS_IN_SECOND * SECONDS_IN_MINUTE;
var CREATE_HITS = '/report-created/';

angular.module('streamium.core', [])
  .service('Session', function(bitcore) {

    var KEY_ID = 'privkey';

    function Session() {
      var privateKey = localStorage.getItem(KEY_ID);
      if (!privateKey) {
        this.privateKey = new bitcore.PrivateKey();
        localStorage.setItem(KEY_ID, this.privateKey.toString())
      } else {
        this.privateKey = new bitcore.PrivateKey(privateKey);
      }
    }

    return new Session();
  })

.service('Duration', function(bitcore) {
  var Duration = {};
  Duration.for = function(rate, satoshis) {
    var satRate = bitcore.Unit.fromBTC(rate).toSatoshis();
    return satoshis / satRate * MILLIS_IN_MINUTE;
  };
  return Duration;
})
.service('Stats', function(bitcore, $http) {

  var $ = bitcore.util.preconditions;
  var _ = bitcore.deps._;

  var report = function(name, obj) {
    obj = obj || {};
    obj.network = config.network;
    config.analytics && mixpanel.track(name, obj);
  };
  var reportHuginn = function(opts) {
    try {
      var noop = function() {};
      $http.post(CREATE_HITS, opts).success(noop).error(noop);
    } catch (e) {
      console.log(e);
    }
  }

  var conditionInt = function(e) {
    try {
      $.checkArgument(_.isString(name));
    } catch (e) {
      mixpanel.track('error', e.message);
    }
  };
  var conditionStr = function(e) {
    try {
      $.checkArgument(_.isString(name));
    } catch (e) {
      mixpanel.track('error', e.message);
    }
  };

  return {

    homepage: function() {
      report('homepage');
    },

    error: function(message) {
      report('error', {message: message});
    },

    client: {

      joinedRoom: function(name) {
        conditionStr(name);
        report('cli-join', {
          name: name
        });
      },

      funded: function(options) {
        conditionInt(options.receivedMoney);
        conditionInt(options.delayToJoin);
        conditionInt(options.rate);
        report('cli-funded', options);
      },

      startedWatching: function(options) {
        conditionInt(options.receivedMoney);
        conditionInt(options.rate);
        report('cli-start', options);
      },

      watchingUpdate: function(seconds) {
        conditionInt(seconds);
        report('cli-update', {
          secondsElapsed: seconds
        });
      },

      endStream: function(options) {
        conditionInt(options.seconds);
        conditionInt(options.totalSpent);
        report('cli-ended', options);
      }
    },

    provider: {

      createdStream: function(priceRate, name, address) {
        conditionInt(priceRate);
        reportHuginn({
          network: config.network,
          rate: priceRate,
          name: name,
          address: address
        });
        report('prov-created', {
          rate: priceRate,
          name: name,
          address: address
        });
      },

      castingScreen: function(name, address) {
        report('prov-castscreen', {
          name: name,
          address: address
        });
      },

      clientJoined: function(options) {
        conditionInt(options.delayToJoin);
        report('prov-userjoin', options);
      },

      chatMessage: function() {
        report('prov-chatmessage');
      },

      endedStream: function(options) {
        conditionInt(options.totalEarned);
        conditionInt(options.totalTime);
        conditionInt(options.rate);
        conditionInt(options.maxActive);
        conditionInt(options.totalClients);
        conditionStr(options.name);
        report('prov-ended', options);
      }
    }
  };

});
