angular.module('Influx')
  .controller('SettingsCtrl', [
    '$scope', 'Signal', 'Config', 'Store',
    function($scope, Signal, Config, Store) {

      // Expose signal configuration
      $scope.signal = Config.signal;

      $scope.Store = Store;

      // Update signal metadata on change
      $scope.$watch('signal.metadata', function(metadata) {
        Signal.metadata(metadata);
      });

    }
  ]);