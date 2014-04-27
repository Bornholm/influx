angular.module('Influx')
  .controller('SideMenuCtrl', [
    '$scope', '$ionicSideMenuDelegate',
    function($scope, $ionicSideMenuDelegate) {

      $scope.toggleLeftSideMenu = function() {
        $ionicSideMenuDelegate.toggleLeft();
      };

    }
  ]);