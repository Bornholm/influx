// Create Influx module
angular.module('Influx', ['ionic', 'ngStorage'])
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
      .state('tabs.neighbourhood', {
        url: '/neighbourhood',
        views: {
          'neighbourhood-tab': {
            controller: 'NeighbourhoodCtrl',
            templateUrl: 'templates/neighbourhood.html'
          }
        }
      })
      .state('tabs.settings', {
        url: '/settings',
        views: {
          'settings-tab': {
            controller: 'SettingsCtrl',
            templateUrl: 'templates/settings.html'
          }
        }
      })
      .state('tabs.feed', {
      url: "/feed",
      views: {
        'home-tab': {
          templateUrl: "templates/feed.html"
        }
      }
      })
      .state('tabs.write', {
      url: "/write",
      views: {
        'write-tab': {
          templateUrl: "templates/write.html"
        }
      }
    });

    $urlRouterProvider.otherwise('/tab/home');

  }])
  .run(['Signal', '$settings', 'Sync', function(Signal, $settings, Sync) {

    Signal.join($settings.signal.port, $settings.signal.metadata)
      .then(function() {
        console.log('Joined !');
      }).then(function() {
        Sync.start();
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