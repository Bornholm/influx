angular.module('Influx')
  .controller('AppCtrl', ['$scope', 'Signaling', function($scope, Signaling) {

    Signaling.join().then(function() {
      console.log('Joined !');
    });

    $scope.peers = Signaling.peers();

    Signaling.on('heartbeat', function() {
      console.log('Heartbeat sent !');
    });

    Signaling.on('check', function() {
      console.log('Checked presence...');
    });

  }]);