angular.module('Influx')
  .factory('Signal', ['$q', '$timeout', '$rootScope',
    function($q, $timeout, $rootScope) {

    var EventEmitter = require('events').EventEmitter;
    var dgram = require('dgram');
    var uuid = require('node-uuid');

    var BROADCAST_ADDRESS = '255.255.255.255';
    var service = new EventEmitter();
    var _server, _port;
    var _heartbeatRate = 30 * 1000;
    var _presenceCheckRate = _heartbeatRate/3;
    var _cancelHeartbeatPromise, _cancelPresenceCheckPromise;
    var _peers = {};
    var _uid = uuid.v4();
    var _metadata = {};

    var HEARTBEAT = 'hbt';
    var LEAVE = 'lve';

    /** Events handlers **/

    function _messageHandler(message, rInfo) {
      var lInfo = _server.address();
      try {
        message = JSON.parse(message.toString());
      } catch(err) {
        // Just ignore invalid messages
        return;
      }
      if(message.uid !== _uid) {
        switch(message.type) {
          case HEARTBEAT:
          $rootScope.$apply(function() {
            var isNew = _updatePeer(
              message.uid,
              rInfo,
              message.data.hbr,
              message.data.meta
            );
            if(isNew) {
              _sendHeartbeat();
            }
          });
          break;
          case LEAVE:
          $rootScope.$apply(function() {
            _removePeer(message.uid);
          });
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
          uid: _uid
        };
        var raw = new Buffer(JSON.stringify(message));
        _server.send(raw, 0, raw.length, _port, BROADCAST_ADDRESS);
        return true;
      }
      return false;
    }

    function _sendHeartbeat() {
      var isSent = _send(HEARTBEAT, {hbr: _heartbeatRate, meta: _metadata});
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

    function _updatePeer(peerUid, rInfo, heartbeatRate, metadata) {
      var key = 'peer_'+peerUid;
      var peer;
      if(key in _peers) {
        peer = _peers[key];
        peer.heartbeatRate = heartbeatRate;
        peer.lastHeartbeat = Date.now();
        peer.metadata = metadata || {};
        service.emit('peerUpdate', peer);
        return false;
      } else {
        peer = _peers[key] = {
          uid: peerUid,
          port: rInfo.port,
          address: rInfo.address,
          lastHeartbeat: Date.now(),
          heartbeatRate: heartbeatRate,
          metadata: metadata || {}
        };
        service.emit('peerUp', peer);
        return true;
      }
    }

    function _removePeer(peerUid) {
      var key = 'peer_'+peerUid;
      if(key in _peers) {
        var peer = _peers[key]
        delete _peers[key];
        service.emit('peerDown', peer);
      }
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
      Object.keys(_peers)
        .forEach(function(key) {
          var peer = _peers[key];
          var now = Date.now();
          var delay = peer.heartbeatRate + peer.heartbeatRate/2;
          if(now > (peer.lastHeartbeat + delay)) {
            _removePeer(peer.uid);
          }
        });
      service.emit('check');
    }

    /** Public API **/

    service.join = function(port, metadata) {

      // If already joined, leave then rejoin
      if(_server) {
        service.leave();
      }
      // Set default port
      _port = port || 25847;
      // Set metadata
      _metadata = metadata || {};
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
        service.emit('join');
        _prepareHeartbeat();
        _preparePresenceCheck();
      });

      return defered.promise;

    };

    service.leave = function() {
      if(_server) {
        _send(LEAVE);
        _cancelHeartbeat();
        _cancelPresenceCheck();
        _server.removeAllListeners();
        $timeout(function() {
          _server.close();
          _server = null;
          service.emit('leave');
        }, 0);
      }
      return service;
    };

    service.peers = function() {
      return _peers;
    };

    service.metadata = function(metadata) {
      if(arguments.length >= 1) {
        _metadata = metadata;
        _sendHeartbeat();
      }
      return _metadata;
    };

    return service; 

  }]);