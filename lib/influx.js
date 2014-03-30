// Create Influx module
angular.module('Influx', ['ionic'])
  .config([
    '$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {

    $stateProvider
      .state('tabs', {
        url: '/tab',
        abstract: true,
        templateUrl: 'templates/tabs.html'
      })
      .state('tabs.home', {
        url: '/home',
        views: {
          'home-tab': {
            templateUrl: 'templates/home.html'
          }
        }
      })
      .state('tabs.settings', {
        url: '/settings',
        views: {
          'settings-tab': {
            templateUrl: 'templates/settings.html'
          }
        }
      })
      .state('tabs.profile', {
        url: '/profile',
        views: {
          'profile-tab': {
            templateUrl: 'templates/profile.html'
          }
        }
      });

    $urlRouterProvider.otherwise('/tab/home');

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