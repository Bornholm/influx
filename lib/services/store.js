angular.module('Influx')
  .factory('Store', ['$q', '$rootScope', function($q, $rootScope) {

      var store = $rootScope.$new(true);

      var db = store.db = new PouchDB('messages');

      db.changes({
        onChange: _changeHandler,
        continuous: true
      });
      
      function _changeHandler() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('change');
        store.$emit.apply(store, args);
      }

      function _pluckDoc(item) {
        return item.doc;
      }

      // Récupère une liste de message à partir d'une date donnée
      store.fetchFromDate = function(fromDate, limit) {

        fromDate = fromDate ? new Date(fromDate).toJSON() : new Date().toJSON();

        var defered = $q.defer();
        var opts = {
          include_docs: true,
          startkey: fromDate,
          limit: limit,
          descending: true
        };
        
        db.allDocs(opts, function(err, res) {
          if(err) {
            return defered.reject(err);
          }
          var rows = res.rows;
          var newMessages = rows.map(_pluckDoc);
          return defered.resolve(newMessages);
        });

        return defered.promise;
      };

      // Publie un message
      store.post = function(text, author) {
        var defered = $q.defer();
        var date = new Date().toJSON();
        var message = {
          _id: date +  Math.random(),
          text: text,
          date: new Date().toJSON(),
          author: {
            name: (author && author.name) ?  author.name : undefined,
            avatar: (author && author.avatar) ? author.avatar : undefined
          }
        };
        db.put(message, function(err) {
          if(err) {
            return defered.reject(err);
          } else {
            return defered.resolve(message);
          }
        });
        return defered.promise;
      };

      return store;

    }
  ]);