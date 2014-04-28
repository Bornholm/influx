angular.module('Influx')
  .controller('NeighbourhoodCtrl', [
    '$scope', 'Signal',
    function($scope, Signal) {

      $scope.peers = Signal.peers();

      $scope.hasPeers = function() {
        for (var key in $scope.peers) {
          if($scope.peers.hasOwnProperty(key)) {
            return true;
          }
        }
        return false;
      };

    }
  ]);