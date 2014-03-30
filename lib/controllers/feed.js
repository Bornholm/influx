angular.module('Influx')
  .controller('FeedCtrl', [
    '$scope', 'Store',
    function($scope, Store) {

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