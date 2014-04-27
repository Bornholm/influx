angular.module('Influx')
  .factory('$settings', [
    '$localStorage',
    function($localStorage) {
      return $localStorage.$default({
        signal: {
          port: 25847,
          metadata: {
            name: 'User_' + (Math.random()*1000 | 0)
          }
        }
      });
    }
  ]);