angular.module('Influx')
  .controller('FeedCtrl', [
    '$scope', 'Store',
    function($scope, Store) {

      $scope.noMoreMessages = false;
      $scope.messages = [];

      $scope.fromNow = function(date) {
        return moment(date).fromNow();
      }

      function isAlreadyShown(messageId) {
        var currentId;
        for(var i = 0, len = $scope.messages.length; i < len; ++i) {
          currentId = $scope.messages[i]._id;
          if(currentId === messageId) {
            return true;
          }
        }
        return false;
      }

      // Récupère une liste de messages à partir d'une date donnée.
      // Si aucune date donnée, utilise la date du dernier message affiché
      // Si aucun message, utilise la date actuelle
      $scope.loadMore = function(fromDate, limit, prepend) {

        // Dernier message en date affiché
        var lastMessage = $scope.messages[$scope.messages.length-1];
        fromDate = fromDate ? moment(fromDate) : (lastMessage ? moment(lastMessage.date) : moment());

        Store.fetchFromDate(fromDate, limit || 5)
          .then(function(messages) {
            // On supprime les messages déjà affichés de la liste
            return messages.filter(function(message) {
              return !isAlreadyShown(message._id);
            });
          })
          .then(function(messages) {
            // Soit on ajoute les messages en début de liste, soit on les ajoutes en fin
            $scope.messages[prepend ? 'unshift': 'push'].apply($scope.messages, messages);
            if(messages.length === 0) {
              $scope.noMoreMessages = true;
            };
          })
          .finally(function() {
            // Quoi qu'il arrive, on indique au système d'infinite scrolling qu'on a modifié la liste
            $scope.$broadcast('scroll.infiniteScrollComplete');
          });
      };

      //
      Store.$on('change', function() {
        // Pour chaque changement, on tente de récupèrer le dernier message en date
        $scope.loadMore(new Date(), 1, true);
      });

    }
  ]);