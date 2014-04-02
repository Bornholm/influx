angular.module('Influx')
  .controller('FeedCtrl', [
    '$scope', 'Store', 'Config',
    function($scope, Store, Config) {

      $scope.noMoreMessages = false;
      $scope.messages = [];

      $scope.fromNow = function(date) {
        return moment(date).fromNow();
      }

      function queryByDate(doc) {
        emit(doc.date, null);
      }

      $scope.loadMore = function(fromDate, limit, prepend) {
        var lastMessage = $scope.messages[$scope.messages.length-1];
        console.log('Loading more messages...');
        fromDate = fromDate ? moment(fromDate) : (lastMessage ? moment(lastMessage.date) : moment());
        limit = limit || 5;
        var opts = {
          include_docs: true,
          endkey: fromDate.toArray(),
          limit: limit,
          descending: true
        };
        
        Store.query(queryByDate, opts, function(err, res) {

          $scope.$apply(function() {

            var rows = res.rows;

            var newMessages = rows.reduce(function(arr, item) {
              if(!isAlreadyShown(item.id)) {
                arr.push(item.doc);
              }
              return arr;
            }, []);

            if(newMessages.length) {

              console.log('Loaded', newMessages.length, 'messages !');

              $scope.messages[prepend ? 'unshift': 'push'].apply($scope.messages, newMessages);
              
            } else {
              console.log('No more messages...');
              $scope.noMoreMessages = true;
            }

            $scope.$broadcast('scroll.infiniteScrollComplete');

          });
        });
      };

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

      // Listen for store changes (new messages)
      Store.changes({
        onChange: function() {
          $scope.loadMore(moment(), 1, true);
        },
        continuous: true
      });

      $scope.addRandomMessage = function() {
        var message = {
          text: 'Random message: ' + (Math.random()*1111|0),
          date: moment().toArray(),
          author: {
            name: Config.signal.metadata.name,
            avatarUrl: null
          }
        };
        console.log(message);
        Store.post(message);
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