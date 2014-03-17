angular.module('Influx')
  .factory('MessageStore', ['$q', function($q) {

    var Datastore = require('nedb');
    var path = require('path');
    var gui = require('nw.gui');

    var service = {};
    var dbPath = path.join(gui.App.dataPath, 'data', 'messages.db');
    var db = new Datastore({filename: dbPath, autoload: true});

    service.save = function(message) {
      
    };

    service.lastMessages = function(skip, limit) {
      var deferred = $q.defer();
      var q = db.find({}).sort({creationDate: 1});
      if(skip !== undefined) {
        q.skip(skip);
      }
      if(limit !== undefined) {
        q.limit(limit);
      }
      q.exec(function(err, messages) {
        if(err) {
          return deferred.reject(err);
        }
        return deferred.resolve(docs);
      });
      return deferred.promise;
    };

    return service; 

  }]);