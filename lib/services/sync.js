angular.module('Influx')
  .factory('Sync', [
    'Store', 'Signal',
    function(Store, Signal) {

      var http = require('http');
      var express = require('express');
      var app = express();
      var server = http.createServer(app);      

      // ROUTES

      app.use(function (req, res, next) {
        var opts = {}
          , data = ''
          , prop;

        // Normalize query string parameters for direct passing
        // into Pouch queries.
        for (prop in req.query) {
          try {
            req.query[prop] = JSON.parse(req.query[prop]);
          } catch (e) {}
        }

        // Custom bodyParsing because express.bodyParser() chokes
        // on `malformed` requests.
        req.on('data', function (chunk) { data += chunk; });
        req.on('end', function () {
          if (data) {
            try {
              req.body = JSON.parse(data);
            } catch (e) {
              req.body = data;
            }
          }
          next();
        });
      });

      app.get('/', function(req, res) {
        res.send(200, {
          'InfluX': 'Welcome!',
          'version': '0.0.0'
        });
      });      

      // Get database information

      app.get('/messages', function (req, res, next) {
        Store.info(function (err, info) {
          if (err) return res.send(404, err);
          res.send(200, info);
        });
      });

      // Bulk docs operations
      app.post('/messages/_bulk_docs', function (req, res, next) {

        // Maybe this should be moved into the leveldb adapter itself? Not sure
        // how uncommon it is for important options to come through in the body
        // https://github.com/daleharvey/pouchdb/issues/435
        var opts = 'new_edits' in req.body
          ? { new_edits: req.body.new_edits }
          : null;

        Store.bulkDocs(req.body, opts, function (err, response) {
          if (err) return res.send(400, err);
          res.send(201, response);
        });

      });

      // All docs operations
      app.all('/messages/_all_docs', function (req, res, next) {
        if (req.method !== 'GET' && req.method !== 'POST') return next();

        // Check that the request body, if present, is an object.
        if (!!req.body && (typeof req.body !== 'object' || Array.isArray(req.body))) {
          return res.send(400, Pouch.BAD_REQUEST);
        }

        for (var prop in req.body) {
          req.query[prop] = req.query[prop] || req.body[prop];
        }

        Store.allDocs(req.query, function (err, response) {
          if (err) return res.send(400, err);
          res.send(200, response);
        });

      });

      // Monitor database changes
      app.get('/messages/_changes', function (req, res, next) {

        // api.changes expects a property `query_params`
        // This is a pretty inefficient way to do it.. Revisit?
        req.query.query_params = JSON.parse(JSON.stringify(req.query));

        var longpoll = function (err, data) {
          if (err) return res.send(409, err);
          if (data.results && data.results.length) {
            data.last_seq = Math.max.apply(Math, data.results.map(function (r) {
              return r.seq;
            }));
            res.send(200, data);
          } else {
            delete req.query.complete;
            req.query.continuous = true;
            req.query.onChange = function (change) {
              res.send(200, change);
            };
            Store.changes(req.query);
          }
        };

        if (req.query.feed) {
          req.socket.setTimeout(86400 * 1000);
          req.query.complete = longpoll;
        } else {
          req.query.complete = function (err, response) {
            if (err) return res.send(409, err);
            res.send(200, response);
          };
        }

        Store.changes(req.query);

      });

      // DB Compaction
      app.post('/messages/_compact', function (req, res, next) {
        Store.compact(function (err, response) {
          if (err) return res.send(500, err);
          res.send(200, response);
        });
      });

      // Revs Diff
      app.post('/messages/_revs_diff', function (req, res, next) {
        Store.revsDiff(req.body || {}, function (err, diffs) {
          console.log(req.body, arguments);
          if (err) return res.send(400, err);

          res.send(200, diffs);
        });
      });

      // Temp Views
      app.post('/messages/_temp_view', function (req, res, next) {
        if (req.body.map) req.body.map = (new Function('return ' + req.body.map))();
        req.query.conflicts = true;
        Store.query(req.body, req.query, function (err, response) {
          if (err) return res.send(400, err);
          res.send(200, response);
        });
      });

      // Query design document info
      app.get('/messages/_design/:id/_info', function (req, res, next) {
        // Dummy data for Fauxton
        res.send(200, {
          'name': req.query.id,
          'view_index': 'Not implemented.'
        });
      });

      // Query a document view
      app.get('/messages/_design/:id/_view/:view', function (req, res, next) {
        var query = req.params.id + '/' + req.params.view;
        Store.query(query, req.query, function (err, response) {
          if (err) return res.send(404, err);
          res.send(200, response);
        });
      });

      // Query design document list handler; Not implemented.
      app.get('/messages/_design/:id/_list(*)', function (req, res, next) {
        res.send(501);
      });

      // Query design document show handler; Not implemented.
      app.get('/messages/_design/:id/_show(*)', function (req, res, next) {
        res.send(501);
      });

      // Query design document update handler; Not implemented.
      app.get('/messages/_design/:id/_update(*)', function (req, res, next) {
        res.send(501);
      });

      // Query design document rewrite handler; Not implemented.
      app.get('/messages/_design/:id/_rewrite(*)', function (req, res, next) {
        res.send(501);
      });

      // Put a document attachment
      app.put('/messages/:id/:attachment(*)', function (req, res, next) {

        // Be careful not to catch normal design docs or local docs
        if (req.params.id === '_design' || req.params.id === '_local') {
          return next();
        }

        var name = req.params.id
          , attachment = req.params.attachment
          , rev = req.query.rev
          , type = req.get('Content-Type') || 'application/octet-stream'
          , body = (req.body === undefined)
              ? new Buffer('')
              : (typeof req.body === 'string')
                ? new Buffer(req.body)
                : new Buffer(JSON.stringify(req.body));

        Store.putAttachment(name, attachment, rev, body, type, function (err, response) {
          if (err) return res.send(409, err);
          res.send(200, response);
        });
      });

      // Retrieve a document attachment
      app.get('/messages/:id/:attachment(*)', function (req, res, next) {

        // Be careful not to catch normal design docs or local docs
        if (req.params.id === '_design' || req.params.id === '_local') {
          return next();
        }

        var name = req.params.id
          , attachment = req.params.attachment;

        Store.get(req.params.id, req.query, function (err, info) {
          if (err) return res.send(404, err);

          if (!info._attachments || !info._attachments[attachment]) {
            return res.send(404, {status:404, error:'not_found', reason:'missing'});
          };

          var type = info._attachments[attachment].content_type;
       
          Store.getAttachment(name, attachment, function (err, response) {
            if (err) return res.send(409, err);
            res.set('Content-Type', type);
            res.send(200, response);
          });    
        });
      });

      // Delete a document attachment
      app.del('/messages/:id/:attachment(*)', function (req, res, next) {

        // Be careful not to catch normal design docs or local docs
        if (req.params.id === '_design' || req.params.id === '_local') {
          return next();
        }

        var name = req.params.id
          , attachment = req.params.attachment
          , rev = req.query.rev;

        Store.removeAttachment(name, attachment, rev, function (err, response) {
          if (err) return res.send(409, err);
          res.send(200, response);
        });
      });

      // Create or update document that has an ID
      app.put('/messages/:id(*)', function (req, res, next) {
        req.body._id = req.body._id || req.query.id;
        if (!req.body._id) {
          req.body._id = (!!req.params.id && req.params.id !== 'null')
            ? req.params.id
            : null;
        }
        Store.put(req.body, req.query, function (err, response) {
          if (err) return res.send(409, err);
          var loc = req.protocol
            + '://'
            + ((req.host === '127.0.0.1') ? '' : req.subdomains.join('.') + '.')
            + req.host
            + '/' + req.params.db
            + '/' + req.body._id;
          res.location(loc);
          res.send(201, response);
        });
      });

      // Create a document
      app.post('/messages', function (req, res, next) {
        Store.post(req.body, req.query, function (err, response) {
          if (err) return res.send(409, err);
          res.send(201, response);
        });
      });

      // Retrieve a document
      app.get('/messages/:id(*)', function (req, res, next) {
        Store.get(req.params.id, req.query, function (err, doc) {
          if (err) return res.send(404, err);
          res.send(200, doc);
        });
      });

      // Delete a document
      app.del('/messages/:id(*)', function (req, res, next) {
        Store.get(req.params.id, req.query, function (err, doc) {
          if (err) return res.send(404, err);
          Store.remove(doc, function (err, response) {
            if (err) return res.send(404, err);
            res.send(200, response);
          });
        });
      });

      // Copy a document
      app.copy('/messages/:id', function (req, res, next) {
        var dest = req.get('Destination')
          , rev
          , match;

        if (!dest) {
          return res.send(400, {
            'error': 'bad_request',
            'reason': 'Destination header is mandatory for COPY.'
          });
        }

        if (match = /(.+?)\?rev=(.+)/.exec(dest)) {
          dest = match[1];
          rev = match[2];
        }

        Store.get(req.params.id, req.query, function (err, doc) {
          if (err) return res.send(404, err);
          doc._id = dest;
          doc._rev = rev;
          Store.put(doc, function (err, response) {
            if (err) return res.send(409, err);
            res.send(200, doc);
          });
        });
      });

      // -- END Routes --

      function startSync(peer) {
        var metadata = peer.metadata;
        if(metadata && metadata.services && metadata.services.messages) {
          var remoteUrl = 'http://' + peer.address + ':' +  metadata.services.messages + '/messages';
          console.log('Replicating', remoteUrl);
          Store.replicate.sync(remoteUrl, {continuous: true});
        }
      };

      Signal.on('peerUpdate', startSync);
      Signal.on('peerUp', startSync);

      return {

        start: function() {
          server.listen(function() {
            var address = server.address();
            var metadata = Signal.metadata();
            var services = metadata.services = metadata.services || {};
            services.messages = address.port;
            Signal.metadata(metadata);
          });
        }

      };

    }
  ]);