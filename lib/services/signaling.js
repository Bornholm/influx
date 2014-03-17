angular.module('Influx')
  .factory('Signaling', ['$q', '$timeout', '$rootScope',
    function($q, $timeout, $rootScope) {

    var EventEmitter = require('events').EventEmitter;
    var dgram = require('dgram');
    var uuid = require('node-uuid');

    var BROADCAST_ADDRESS = '255.255.255.255';
    var service = new EventEmitter();
    var _server, _port;
    var _heartbeatRate = 30 * 1000;
    var _presenceCheckRate = _heartbeatRate;
    var _cancelHeartbeatPromise, _cancelPresenceCheckPromise;
    var _peers = [];
    var _uuid = uuid.v4();

    var HEARTBEAT = 'hbt';
    var MESSAGE = 'msg';

    /** Events handlers **/

    function _messageHandler(message, rInfo) {
      var lInfo = _server.address();
      try {
        message = JSON.parse(message.toString());
      } catch(err) {
        // Just ignore invalid messages
        return;
      }
      if(message.uuid !== _uuid) {
        switch(message.type) {
          case HEARTBEAT:
          $rootScope.$apply(function() {
            var isNew = _updatePeer(rInfo.address, rInfo.port, message.data.hbr);
            if(isNew) {
              _sendHeartbeat();
            }
          });
          break;
          case MESSAGE:
            service.emit('message', message.data, message.uuid, rInfo);
          break;
        }
      }
    }

    function _errorHandler(err) {
      service.emit('error', err);
      service.leave();
    }

    /** Private methods **/

    function _send(messageType, data) {
      if(_server) {
        var message = {
          type: messageType,
          data: data,
          uuid: _uuid
        };
        var raw = new Buffer(JSON.stringify(message));
        _server.send(raw, 0, raw.length, _port, BROADCAST_ADDRESS);
        return true;
      }
      return false;
    }

    function _sendHeartbeat() {
      var isSent = _send(HEARTBEAT, {hbr: _heartbeatRate});
      if(isSent) {
        service.emit('heartbeat');
      }
    }

    function _prepareHeartbeat() {
      _cancelHeartbeatPromise = $timeout(
        function() {
          _sendHeartbeat();
          if(_cancelHeartbeatPromise) {
            _prepareHeartbeat();
          }
        },
        _cancelHeartbeatPromise ? _heartbeatRate : 0
      );
    }

    function _cancelHeartbeat() {
      $timeout.cancel(_cancelHeartbeatPromise);
      _cancelHeartbeatPromise = null;
    }

    function _updatePeer(address, port, heartbeatRate, cb) {
      var found = false;
      _peers.forEach(function(peer) {
        if(peer.address === address && peer.port === port) {
          found = true;
          peer.heartbeatRate = heartbeatRate;
          peer.lastHeartbeat = Date.now();
        }
      });
      if(!found) {
        _peers.push({
          address: address,
          port: port,
          lastHeartbeat: Date.now(),
          heartbeatRate: heartbeatRate
        });
        return true;
      }
      return false;
    }

    function _preparePresenceCheck() {
      _cancelPresenceCheckPromise = $timeout(
        function() {
          _checkPresence();
          if(_cancelPresenceCheckPromise) {
            _preparePresenceCheck();
          }
        },
        _cancelPresenceCheckPromise ? _presenceCheckRate : 0
      );
    }

    function _cancelPresenceCheck() {
      $timeout.cancel(_cancelPresenceCheckPromise);
      _cancelPresenceCheckPromise = null;
    }

    function _checkPresence() {
      _peers.forEach(function(peer, i) {
        var now = Date.now();
        var delay = peer.heartbeatRate + peer.heartbeatRate/2;
        if(now > (peer.lastHeartbeat + delay)) {
          _peers.splice(i, 1);
        }
      });
      service.emit('check');
    }

    /** Public API **/

    service.join = function(port) {

      // If already joined, leave then rejoin
      if(_server) {
        service.leave();
      }

      // Set default port
      _port = port || 25847;
      var defered = $q.defer();
      _server = dgram.createSocket('udp4');

      // Define bind error handler
      function bindErrorHandler(err) {
        socket.removeListener('error', bindErrorHandler);
        return defered.reject(err);
      }

      _server.once('error', bindErrorHandler);

      // Bind socket on port
      _server.bind(_port, '0.0.0.0', function() {
        _server.removeListener('error', bindErrorHandler);
        try {
          _server.setBroadcast(true);
          _server.on('message', _messageHandler);
          _server.once('error', _errorHandler);
        } catch(err) {
          return defered.reject(err);
        }
        defered.resolve(service);
        service.emit('joined');
        _prepareHeartbeat();
        _preparePresenceCheck();
      });

      return defered.promise;

    };

    service.leave = function() {
      if(_server) {
        _cancelHeartbeat();
        _cancelPresenceCheck();
        _server.removeAllListeners();
        _server.close();
        _server = null;
        service.emit('leaved');
      }
      return service;
    };

    service.peers = function() {
      return _peers;
    };

    service.broadcast = function(data) {
      _send(MESSAGE, data)
      return service;
    };

    return service; 

  }]);