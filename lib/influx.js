// Create Influx module
angular.module('Influx', ['ngRoute'])
  .config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {

    // Define routes
    $routeProvider.when('/profile', {
      templateUrl: 'templates/profile.html'
    });

    $routeProvider.when('/settings', {
      templateUrl: 'templates/settings.html'
    });

    $routeProvider.otherwise({
      templateUrl: 'templates/home.html'
    });

    $locationProvider.html5Mode(false);

  }])
  .run(['Signal', function(Signal) {

    Signal.join().then(function() {
      console.log('Joined !');
    });

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


  }])