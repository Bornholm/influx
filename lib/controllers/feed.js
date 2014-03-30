angular.module('Influx')
  .controller('FeedCtrl', [
    '$scope', 'Store', 'Config',
    function($scope, Store, Config) {

      $scope.messages = [];

      $scope.updateFeed = function() {
        Store.allDocs({limit: 10, include_docs: true}, function(err, res) {
          $scope.$apply(function() {
            if(res.rows) {
              $scope.messages = res.rows.map(function(entry) {
                return entry.doc;
              });
            } else {
              $scope.messages = [];
            }
          });
        });
      };  

      // Listen for store changes (new messages)
      Store.changes({
        onChange: function() {
          $scope.updateFeed();
        },
        continuous: true
      });

      $scope.addRandomMessage = function() {
        Store.post({
          text: 'Random message: ' + (Math.random()*1111|0),
          ts: Date.now(),
          author: {
            name: Config.signal.metadata.name,
            avatarUrl: null
          }
        });
      };

      /**
      
        Poster un message:

        Store.post({
          text: 'Texte du message',
          author: {
            name: 'Nom auteur',
            avatarUrl: 'URL de l'avatar, preferer une url type "Data URL" 
          }
        });

      **/

    }
  ]);