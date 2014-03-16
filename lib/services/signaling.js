angular.module('Influx')
  .factory('Signaling', ['$q', '$rootScope', function($q, $rootScope) {

    var EventEmitter = require('events').EventEmitter;
    var dgram = require('dgram');
    var assert = require('assert');

    var service = new EventEmitter();
    var _server;
    var _port;
    var _heartbeatRate = 60 * 2 * 1000; // Every two minutes by default
    var _heartbeatTimeoutID;
    var _peers = [];

    var HEARTBEAT = 'hbt';
    var MESSAGE = 'msg';

    /** Events handlers **/

    function _messageHandler(message, rInfo) {
      try {
        message = JSON.parse(message.toString());
      } catch(err) {
        // Just ignore invalid messages
        return;
      }
      switch(message.type) {
        case HEARTBEAT:
          _updatePeer(rInfo.address, rInfo.port, message.data.hbr);
        break;
        case MESSAGE:
          service.emit('message', message.data, peerInfo);
        break;
      }

    }

    function _errorHandler(err) {
      service.emit('error', err);
      service.leave();
    }

    /** Private methods **/

    function _send(messageType, data) {
      
    }

    function _sendHeartbeat() {
      _send(HEARTBEAT, {hbr: _heartbeatRate});
      service.emit('heartbeat');
      if(_heartbeatTimeoutID) {
        _prepareHeartbeat();
      }
    }

    function _prepareHeartbeat() {
      _heartbeatTimeoutID = setTimeout(
        _sendHeartbeat,
        _heartbeatTimeoutID ? _heartbeatRate : 0
      );
    }

    function _stopHeartbeat() {
      clearTimeout(_heartbeatTimeoutID);
      _heartbeatTimeoutID = null;
    }

    function _updatePeer(address, port, heartbeatRate) {
      var found = false;
      _peers.forEach(function(peer) {
        if(peer.address === address && peer.host === host) {
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
      }
    }

    function _checkPresence() {
      
    }

    /** Public API **/

    service.join = function(membership, port) {

      assert.ok(membership, 'membership IP address should not be null !');

      // If already joined, leave then rejoin
      if(_server) {
        service.leave();
      }

      // Set default port
      _port = port || 25890;
      var defered = $q.defer();
      _server = dgram.createSocket('udp4');

      // Define bind error handler
      function bindErrorHandler(err) {
        socket.removeListener('error', bindErrorHandler);
        return defered.reject(err);
      }

      _server.once('error', bindErrorHandler);

      // Bind socket on port
      _server.bind(_port, function() {
        _server.removeListener('error', bindErrorHandler);
        try {
          _server.setBroadcast(true)
          _server.setMulticastTTL(128);
          _server.addMembership(membership);
          _server.on('message', _messageHandler);
          _server.once('error', _errorHandler);
          _prepareHeartbeat();
        } catch(err) {
          return defered.reject(err);
        }
        return defered.resolve();
        service.emit('joined');
      });

      return defered.promise;

    };

    service.leave = function() {
      if(_server) {
        _stopHeartbeat();
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