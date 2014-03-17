angular.module('Influx')
  .controller('AppCtrl', ['$scope', 'Signaling', function($scope, Signaling) {

    Signaling.join().then(function() {
      console.log('Joined !');
    });

    Signaling.on('heartbeat', function() {
      console.log('Heartbeat sent !');
    });

  }]);