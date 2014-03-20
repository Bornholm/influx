// Create Influx module
angular.module('Influx', ['ngRoute'])
  .constant('DEFAULT_SETTINGS', {
      SIGNAL: {
        PORT: 25847,
        HOST: '0.0.0.0'
      }
  })
  .config([
    '$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {

      // Define routes
      $routeProvider.when('/profile', {
        templateUrl: 'templates/profile.html'
      });

      $routeProvider.when('/settings', {
        templateUrl: 'templates/settings.html'
      });

      $routeProvider.when('/home', {
        templateUrl: 'templates/home.html'
      });

      $routeProvider.otherwise({redirectTo: '/home'});

      $locationProvider.html5Mode(false);

    }
  ])
  .run([
    'DEFAULT_SETTINGS', 'Signal',
    function(DS, Signal) {

      Signal.join(DS.SIGNAL.HOST, DS.SIGNAL.PORT).then(function() {
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
    }
  ])