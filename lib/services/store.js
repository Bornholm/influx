angular.module('Influx')
  .factory('Store', [function() {
      var store = new PouchDB('messages');
      return store;
    }
  ]);