angular.module('Influx')
  .controller('FeedCtrl', [
    '$scope', 'Store', 'Config',
    function($scope, Store, Config) {

      var uuid = require('node-uuid');

      $scope.noMoreMessages = false;
      $scope.messages = [];

      $scope.loadMore = function() {
        var lastMessage = $scope.messages[$scope.messages.length-1];
        var limit = 6;
        var opts = {
          include_docs: true,
          startkey: lastMessage ? lastMessage._id : null,
          limit: limit,
          descending: true
        };
        Store.allDocs(opts, function(err, res) {
          $scope.$apply(function() {

            var rows = res.rows;

            var newMessages = rows.reduce(function(arr, item) {
              if(!isAlreadyShown(item.id)) {
                arr.push(item.doc);
              }
              return arr;
            }, []);

            if(newMessages.length) {

              if(lastMessage && newMessages[0]._id === lastMessage._id) {
                newMessages.shift();
              }

              console.log('Load more', newMessages.map(function(d) {return d._id}));

              if(newMessages.length < limit) {
                console.log('No more messages...');
                $scope.noMoreMessages = true;
              }

              $scope.messages.push.apply($scope.messages, newMessages);
              
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

      $scope.fetchMessage = function(messageId) {
        Store.get(messageId, function(err, message) {
          $scope.$apply(function() {
            if(!isAlreadyShown(messageId)) {
              $scope.messages.unshift(message);
            }
          });
        });
      };

      // Listen for store changes (new messages)
      Store.changes({
        onChange: function(message) {
          $scope.fetchMessage(message.id);
        },
        continuous: true
      });

      $scope.addRandomMessage = function() {
        var ts = Date.now();
        Store.put({
          _id: ts + ':' + uuid.v4(),
          text: 'Random message: ' + (Math.random()*1111|0),
          ts: ts,
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