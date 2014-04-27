angular.module('Influx')
  .controller('WriteCtrl', [
    '$scope', 'Store', '$settings',
    function($scope, Store, $settings) {

      $scope.text = '';

      $scope.send = function() {
        Store.post($scope.text, {
          name: $settings.signal.metadata.name
        }).then(function(message) {
          console.log('Posted message', message);
          $scope.text = '';
          $scope.toggleLeftSideMenu();
        });
      };

      $scope.keyDownHandler = function($evt) {
        if($evt.keyCode === 13 && !$evt.shiftKey && $scope.text.length > 0) {
          $scope.send();
        }
      };

    }
  ]);