angular.module('Influx')
  .controller('SettingsCtrl', [
    '$scope', 'DEFAULT_SETTINGS',
    function($scope, DS) {

      $scope.signalPort = DS.SIGNAL.PORT;
      $scope.signalHost = DS.SIGNAL.HOST;


    }]);