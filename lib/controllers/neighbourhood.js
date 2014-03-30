angular.module('Influx')
  .controller('NeighbourhoodCtrl', [
    '$scope', 'Signal',
    function($scope, Signal) {

      $scope.peers = Signal.peers();

    }
  ]);