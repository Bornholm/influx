angular.module('Influx')
  .controller('WriteCtrl', [
    '$scope', 'Store', 'Config',
    function($scope, Store, Config) {

      $scope.text = '';

      $scope.send = function() {
        Store.post($scope.text, {
          name: Config.signal.metadata.name
        }).then(function(message) {
          console.log('Posted message', message);
          $scope.text = '';
        });
      };

    }
  ]);