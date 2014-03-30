angular.module('Influx')
  .controller('SettingsCtrl', [
    '$scope', 'Signal', 'Config',
    function($scope, Signal, Config) {

      // Expose signal configuration
      $scope.signal = Config.signal;

      // Update signal metadata on change
      $scope.$watch('signal.metadata', function(metadata) {
        Signal.metadata(metadata);
      });

    }
  ]);