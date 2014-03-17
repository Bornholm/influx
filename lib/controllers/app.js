angular.module('Influx')
  .controller('AppCtrl', ['$scope', 'Signal', function($scope, Signal) {

    Signal.join().then(function() {
      console.log('Joined !');
    });

    $scope.peers = Signal.peers();

    Signal.on('heartbeat', function() {
      console.log('Heartbeat sent !');
    });

    Signal.on('check', function() {
      console.log('Checked presence...');
    });

    // On exit, send "LEAVE" signal
    var gui = require('nw.gui');
    var win = gui.Window.get();
    win.on('close', function() {
      Signal.leave();
      win.close(true);
    });

  }]);