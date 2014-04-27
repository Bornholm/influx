angular.module('Influx')
  .controller('SettingsCtrl', [
    '$scope', 'Signal', '$settings', 'Store',
    function($scope, Signal, $settings, Store) {

      // Expose signal configuration
      $scope.signal = $settings.signal;

      $scope.Store = Store;

      // Update signal metadata on change
      $scope.$watch('signal.metadata', function(metadata) {
        Signal.metadata(metadata);
      });

    }
  ]);