angular.module('Influx')
  .factory('Signaling', ['$q', '$rootScope', function($q, $rootScope) {

    var EventEmitter = require('events').EventEmitter;
    var dgram = require('dgram');
    var uuid = require('node-uuid');

    var BROADCAST_ADDRESS = '255.255.255.255';
    var service = new EventEmitter();
    var _server, _port;
    var _heartbeatRate = 10 * 1000; // Every two minutes by default
    var _heartbeatTimeoutID;
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
            console.log('Received heartbeat', rInfo, message.uuid);
            _updatePeer(rInfo.address, rInfo.port, message.data.hbr);
          break;
          case MESSAGE:
            service.emit('message', message.data, rInfo);
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
      }
    }

    function _checkPresence() {
      
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