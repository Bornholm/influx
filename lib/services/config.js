angular.module('Influx')
  .value('Config', {
      signal: {
        port: 25847,
        metadata: {
          name: 'User_' + (Math.random()*1000 | 0)
        }
      }
    }
  );