(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var NpmModuleMongodb = Package['npm-mongo'].NpmModuleMongodb;
var NpmModuleMongodbVersion = Package['npm-mongo'].NpmModuleMongodbVersion;
var AllowDeny = Package['allow-deny'].AllowDeny;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var MongoID = Package['mongo-id'].MongoID;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var MaxHeap = Package['binary-heap'].MaxHeap;
var MinHeap = Package['binary-heap'].MinHeap;
var MinMaxHeap = Package['binary-heap'].MinMaxHeap;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MongoInternals, MongoTest, MongoConnection, CursorDescription, Cursor, listenAll, forEachTrigger, OPLOG_COLLECTION, idForOp, OplogHandle, ObserveMultiplexer, ObserveHandle, DocFetcher, PollingObserveDriver, OplogObserveDriver, LocalCollectionDriver, Mongo;

var require = meteorInstall({"node_modules":{"meteor":{"mongo":{"mongo_driver.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_driver.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Provide a synchronous Collection API using fibers, backed by
 * MongoDB.  This is only for use on the server, and mostly identical
 * to the client API.
 *
 * NOTE: the public API methods must be run within a fiber. If you call
 * these outside of a fiber they will explode!
 */var MongoDB = NpmModuleMongodb;

var Future = Npm.require('fibers/future');

MongoInternals = {};
MongoTest = {};
MongoInternals.NpmModules = {
  mongodb: {
    version: NpmModuleMongodbVersion,
    module: MongoDB
  }
}; // Older version of what is now available via
// MongoInternals.NpmModules.mongodb.module.  It was never documented, but
// people do use it.
// XXX COMPAT WITH 1.0.3.2

MongoInternals.NpmModule = MongoDB; // This is used to add or remove EJSON from the beginning of everything nested
// inside an EJSON custom type. It should only be called on pure JSON!

var replaceNames = function (filter, thing) {
  if (typeof thing === "object") {
    if (_.isArray(thing)) {
      return _.map(thing, _.bind(replaceNames, null, filter));
    }

    var ret = {};

    _.each(thing, function (value, key) {
      ret[filter(key)] = replaceNames(filter, value);
    });

    return ret;
  }

  return thing;
}; // Ensure that EJSON.clone keeps a Timestamp as a Timestamp (instead of just
// doing a structural clone).
// XXX how ok is this? what if there are multiple copies of MongoDB loaded?


MongoDB.Timestamp.prototype.clone = function () {
  // Timestamps should be immutable.
  return this;
};

var makeMongoLegal = function (name) {
  return "EJSON" + name;
};

var unmakeMongoLegal = function (name) {
  return name.substr(5);
};

var replaceMongoAtomWithMeteor = function (document) {
  if (document instanceof MongoDB.Binary) {
    var buffer = document.value(true);
    return new Uint8Array(buffer);
  }

  if (document instanceof MongoDB.ObjectID) {
    return new Mongo.ObjectID(document.toHexString());
  }

  if (document["EJSON$type"] && document["EJSON$value"] && _.size(document) === 2) {
    return EJSON.fromJSONValue(replaceNames(unmakeMongoLegal, document));
  }

  if (document instanceof MongoDB.Timestamp) {
    // For now, the Meteor representation of a Mongo timestamp type (not a date!
    // this is a weird internal thing used in the oplog!) is the same as the
    // Mongo representation. We need to do this explicitly or else we would do a
    // structural clone and lose the prototype.
    return document;
  }

  return undefined;
};

var replaceMeteorAtomWithMongo = function (document) {
  if (EJSON.isBinary(document)) {
    // This does more copies than we'd like, but is necessary because
    // MongoDB.BSON only looks like it takes a Uint8Array (and doesn't actually
    // serialize it correctly).
    return new MongoDB.Binary(Buffer.from(document));
  }

  if (document instanceof Mongo.ObjectID) {
    return new MongoDB.ObjectID(document.toHexString());
  }

  if (document instanceof MongoDB.Timestamp) {
    // For now, the Meteor representation of a Mongo timestamp type (not a date!
    // this is a weird internal thing used in the oplog!) is the same as the
    // Mongo representation. We need to do this explicitly or else we would do a
    // structural clone and lose the prototype.
    return document;
  }

  if (EJSON._isCustomType(document)) {
    return replaceNames(makeMongoLegal, EJSON.toJSONValue(document));
  } // It is not ordinarily possible to stick dollar-sign keys into mongo
  // so we don't bother checking for things that need escaping at this time.


  return undefined;
};

var replaceTypes = function (document, atomTransformer) {
  if (typeof document !== 'object' || document === null) return document;
  var replacedTopLevelAtom = atomTransformer(document);
  if (replacedTopLevelAtom !== undefined) return replacedTopLevelAtom;
  var ret = document;

  _.each(document, function (val, key) {
    var valReplaced = replaceTypes(val, atomTransformer);

    if (val !== valReplaced) {
      // Lazy clone. Shallow copy.
      if (ret === document) ret = _.clone(document);
      ret[key] = valReplaced;
    }
  });

  return ret;
};

MongoConnection = function (url, options) {
  var self = this;
  options = options || {};
  self._observeMultiplexers = {};
  self._onFailoverHook = new Hook();
  var mongoOptions = Object.assign({
    // Reconnect on error.
    autoReconnect: true,
    // Try to reconnect forever, instead of stopping after 30 tries (the
    // default), with each attempt separated by 1000ms.
    reconnectTries: Infinity
  }, Mongo._connectionOptions); // Disable the native parser by default, unless specifically enabled
  // in the mongo URL.
  // - The native driver can cause errors which normally would be
  //   thrown, caught, and handled into segfaults that take down the
  //   whole app.
  // - Binary modules don't yet work when you bundle and move the bundle
  //   to a different platform (aka deploy)
  // We should revisit this after binary npm module support lands.

  if (!/[\?&]native_?[pP]arser=/.test(url)) {
    mongoOptions.native_parser = false;
  } // Internally the oplog connections specify their own poolSize
  // which we don't want to overwrite with any user defined value


  if (_.has(options, 'poolSize')) {
    // If we just set this for "server", replSet will override it. If we just
    // set it for replSet, it will be ignored if we're not using a replSet.
    mongoOptions.poolSize = options.poolSize;
  }

  self.db = null; // We keep track of the ReplSet's primary, so that we can trigger hooks when
  // it changes.  The Node driver's joined callback seems to fire way too
  // often, which is why we need to track it ourselves.

  self._primary = null;
  self._oplogHandle = null;
  self._docFetcher = null;
  var connectFuture = new Future();
  MongoDB.connect(url, mongoOptions, Meteor.bindEnvironment(function (err, db) {
    if (err) {
      throw err;
    } // First, figure out what the current primary is, if any.


    if (db.serverConfig.isMasterDoc) {
      self._primary = db.serverConfig.isMasterDoc.primary;
    }

    db.serverConfig.on('joined', Meteor.bindEnvironment(function (kind, doc) {
      if (kind === 'primary') {
        if (doc.primary !== self._primary) {
          self._primary = doc.primary;

          self._onFailoverHook.each(function (callback) {
            callback();
            return true;
          });
        }
      } else if (doc.me === self._primary) {
        // The thing we thought was primary is now something other than
        // primary.  Forget that we thought it was primary.  (This means
        // that if a server stops being primary and then starts being
        // primary again without another server becoming primary in the
        // middle, we'll correctly count it as a failover.)
        self._primary = null;
      }
    })); // Allow the constructor to return.

    connectFuture['return'](db);
  }, connectFuture.resolver() // onException
  )); // Wait for the connection to be successful; throws on failure.

  self.db = connectFuture.wait();

  if (options.oplogUrl && !Package['disable-oplog']) {
    self._oplogHandle = new OplogHandle(options.oplogUrl, self.db.databaseName);
    self._docFetcher = new DocFetcher(self);
  }
};

MongoConnection.prototype.close = function () {
  var self = this;
  if (!self.db) throw Error("close called before Connection created?"); // XXX probably untested

  var oplogHandle = self._oplogHandle;
  self._oplogHandle = null;
  if (oplogHandle) oplogHandle.stop(); // Use Future.wrap so that errors get thrown. This happens to
  // work even outside a fiber since the 'close' method is not
  // actually asynchronous.

  Future.wrap(_.bind(self.db.close, self.db))(true).wait();
}; // Returns the Mongo Collection object; may yield.


MongoConnection.prototype.rawCollection = function (collectionName) {
  var self = this;
  if (!self.db) throw Error("rawCollection called before Connection created?");
  var future = new Future();
  self.db.collection(collectionName, future.resolver());
  return future.wait();
};

MongoConnection.prototype._createCappedCollection = function (collectionName, byteSize, maxDocuments) {
  var self = this;
  if (!self.db) throw Error("_createCappedCollection called before Connection created?");
  var future = new Future();
  self.db.createCollection(collectionName, {
    capped: true,
    size: byteSize,
    max: maxDocuments
  }, future.resolver());
  future.wait();
}; // This should be called synchronously with a write, to create a
// transaction on the current write fence, if any. After we can read
// the write, and after observers have been notified (or at least,
// after the observer notifiers have added themselves to the write
// fence), you should call 'committed()' on the object returned.


MongoConnection.prototype._maybeBeginWrite = function () {
  var fence = DDPServer._CurrentWriteFence.get();

  if (fence) {
    return fence.beginWrite();
  } else {
    return {
      committed: function () {}
    };
  }
}; // Internal interface: adds a callback which is called when the Mongo primary
// changes. Returns a stop handle.


MongoConnection.prototype._onFailover = function (callback) {
  return this._onFailoverHook.register(callback);
}; //////////// Public API //////////
// The write methods block until the database has confirmed the write (it may
// not be replicated or stable on disk, but one server has confirmed it) if no
// callback is provided. If a callback is provided, then they call the callback
// when the write is confirmed. They return nothing on success, and raise an
// exception on failure.
//
// After making a write (with insert, update, remove), observers are
// notified asynchronously. If you want to receive a callback once all
// of the observer notifications have landed for your write, do the
// writes inside a write fence (set DDPServer._CurrentWriteFence to a new
// _WriteFence, and then set a callback on the write fence.)
//
// Since our execution environment is single-threaded, this is
// well-defined -- a write "has been made" if it's returned, and an
// observer "has been notified" if its callback has returned.


var writeCallback = function (write, refresh, callback) {
  return function (err, result) {
    if (!err) {
      // XXX We don't have to run this on error, right?
      try {
        refresh();
      } catch (refreshErr) {
        if (callback) {
          callback(refreshErr);
          return;
        } else {
          throw refreshErr;
        }
      }
    }

    write.committed();

    if (callback) {
      callback(err, result);
    } else if (err) {
      throw err;
    }
  };
};

var bindEnvironmentForWrite = function (callback) {
  return Meteor.bindEnvironment(callback, "Mongo write");
};

MongoConnection.prototype._insert = function (collection_name, document, callback) {
  var self = this;

  var sendError = function (e) {
    if (callback) return callback(e);
    throw e;
  };

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e.expected = true;
    sendError(e);
    return;
  }

  if (!(LocalCollection._isPlainObject(document) && !EJSON._isCustomType(document))) {
    sendError(new Error("Only plain objects may be inserted into MongoDB"));
    return;
  }

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      collection: collection_name,
      id: document._id
    });
  };

  callback = bindEnvironmentForWrite(writeCallback(write, refresh, callback));

  try {
    var collection = self.rawCollection(collection_name);
    collection.insert(replaceTypes(document, replaceMeteorAtomWithMongo), {
      safe: true
    }, callback);
  } catch (err) {
    write.committed();
    throw err;
  }
}; // Cause queries that may be affected by the selector to poll in this write
// fence.


MongoConnection.prototype._refresh = function (collectionName, selector) {
  var refreshKey = {
    collection: collectionName
  }; // If we know which documents we're removing, don't poll queries that are
  // specific to other documents. (Note that multiple notifications here should
  // not cause multiple polls, since all our listener is doing is enqueueing a
  // poll.)

  var specificIds = LocalCollection._idsMatchedBySelector(selector);

  if (specificIds) {
    _.each(specificIds, function (id) {
      Meteor.refresh(_.extend({
        id: id
      }, refreshKey));
    });
  } else {
    Meteor.refresh(refreshKey);
  }
};

MongoConnection.prototype._remove = function (collection_name, selector, callback) {
  var self = this;

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e.expected = true;

    if (callback) {
      return callback(e);
    } else {
      throw e;
    }
  }

  var write = self._maybeBeginWrite();

  var refresh = function () {
    self._refresh(collection_name, selector);
  };

  callback = bindEnvironmentForWrite(writeCallback(write, refresh, callback));

  try {
    var collection = self.rawCollection(collection_name);

    var wrappedCallback = function (err, driverResult) {
      callback(err, transformResult(driverResult).numberAffected);
    };

    collection.remove(replaceTypes(selector, replaceMeteorAtomWithMongo), {
      safe: true
    }, wrappedCallback);
  } catch (err) {
    write.committed();
    throw err;
  }
};

MongoConnection.prototype._dropCollection = function (collectionName, cb) {
  var self = this;

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      collection: collectionName,
      id: null,
      dropCollection: true
    });
  };

  cb = bindEnvironmentForWrite(writeCallback(write, refresh, cb));

  try {
    var collection = self.rawCollection(collectionName);
    collection.drop(cb);
  } catch (e) {
    write.committed();
    throw e;
  }
}; // For testing only.  Slightly better than `c.rawDatabase().dropDatabase()`
// because it lets the test's fence wait for it to be complete.


MongoConnection.prototype._dropDatabase = function (cb) {
  var self = this;

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      dropDatabase: true
    });
  };

  cb = bindEnvironmentForWrite(writeCallback(write, refresh, cb));

  try {
    self.db.dropDatabase(cb);
  } catch (e) {
    write.committed();
    throw e;
  }
};

MongoConnection.prototype._update = function (collection_name, selector, mod, options, callback) {
  var self = this;

  if (!callback && options instanceof Function) {
    callback = options;
    options = null;
  }

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e.expected = true;

    if (callback) {
      return callback(e);
    } else {
      throw e;
    }
  } // explicit safety check. null and undefined can crash the mongo
  // driver. Although the node driver and minimongo do 'support'
  // non-object modifier in that they don't crash, they are not
  // meaningful operations and do not do anything. Defensively throw an
  // error here.


  if (!mod || typeof mod !== 'object') throw new Error("Invalid modifier. Modifier must be an object.");

  if (!(LocalCollection._isPlainObject(mod) && !EJSON._isCustomType(mod))) {
    throw new Error("Only plain objects may be used as replacement" + " documents in MongoDB");
  }

  if (!options) options = {};

  var write = self._maybeBeginWrite();

  var refresh = function () {
    self._refresh(collection_name, selector);
  };

  callback = writeCallback(write, refresh, callback);

  try {
    var collection = self.rawCollection(collection_name);
    var mongoOpts = {
      safe: true
    }; // explictly enumerate options that minimongo supports

    if (options.upsert) mongoOpts.upsert = true;
    if (options.multi) mongoOpts.multi = true; // Lets you get a more more full result from MongoDB. Use with caution:
    // might not work with C.upsert (as opposed to C.update({upsert:true}) or
    // with simulated upsert.

    if (options.fullResult) mongoOpts.fullResult = true;
    var mongoSelector = replaceTypes(selector, replaceMeteorAtomWithMongo);
    var mongoMod = replaceTypes(mod, replaceMeteorAtomWithMongo);

    var isModify = LocalCollection._isModificationMod(mongoMod);

    if (options._forbidReplace && !isModify) {
      var err = new Error("Invalid modifier. Replacements are forbidden.");

      if (callback) {
        return callback(err);
      } else {
        throw err;
      }
    } // We've already run replaceTypes/replaceMeteorAtomWithMongo on
    // selector and mod.  We assume it doesn't matter, as far as
    // the behavior of modifiers is concerned, whether `_modify`
    // is run on EJSON or on mongo-converted EJSON.
    // Run this code up front so that it fails fast if someone uses
    // a Mongo update operator we don't support.


    let knownId;

    if (options.upsert) {
      try {
        let newDoc = LocalCollection._createUpsertDocument(selector, mod);

        knownId = newDoc._id;
      } catch (err) {
        if (callback) {
          return callback(err);
        } else {
          throw err;
        }
      }
    }

    if (options.upsert && !isModify && !knownId && options.insertedId && !(options.insertedId instanceof Mongo.ObjectID && options.generatedId)) {
      // In case of an upsert with a replacement, where there is no _id defined
      // in either the query or the replacement doc, mongo will generate an id itself. 
      // Therefore we need this special strategy if we want to control the id ourselves.
      // We don't need to do this when:
      // - This is not a replacement, so we can add an _id to $setOnInsert
      // - The id is defined by query or mod we can just add it to the replacement doc
      // - The user did not specify any id preference and the id is a Mongo ObjectId, 
      //     then we can just let Mongo generate the id
      simulateUpsertWithInsertedId(collection, mongoSelector, mongoMod, options, // This callback does not need to be bindEnvironment'ed because
      // simulateUpsertWithInsertedId() wraps it and then passes it through
      // bindEnvironmentForWrite.
      function (error, result) {
        // If we got here via a upsert() call, then options._returnObject will
        // be set and we should return the whole object. Otherwise, we should
        // just return the number of affected docs to match the mongo API.
        if (result && !options._returnObject) {
          callback(error, result.numberAffected);
        } else {
          callback(error, result);
        }
      });
    } else {
      if (options.upsert && !knownId && options.insertedId && isModify) {
        if (!mongoMod.hasOwnProperty('$setOnInsert')) {
          mongoMod.$setOnInsert = {};
        }

        knownId = options.insertedId;
        Object.assign(mongoMod.$setOnInsert, replaceTypes({
          _id: options.insertedId
        }, replaceMeteorAtomWithMongo));
      }

      collection.update(mongoSelector, mongoMod, mongoOpts, bindEnvironmentForWrite(function (err, result) {
        if (!err) {
          var meteorResult = transformResult(result);

          if (meteorResult && options._returnObject) {
            // If this was an upsert() call, and we ended up
            // inserting a new doc and we know its id, then
            // return that id as well.
            if (options.upsert && meteorResult.insertedId) {
              if (knownId) {
                meteorResult.insertedId = knownId;
              } else if (meteorResult.insertedId instanceof MongoDB.ObjectID) {
                meteorResult.insertedId = new Mongo.ObjectID(meteorResult.insertedId.toHexString());
              }
            }

            callback(err, meteorResult);
          } else {
            callback(err, meteorResult.numberAffected);
          }
        } else {
          callback(err);
        }
      }));
    }
  } catch (e) {
    write.committed();
    throw e;
  }
};

var transformResult = function (driverResult) {
  var meteorResult = {
    numberAffected: 0
  };

  if (driverResult) {
    var mongoResult = driverResult.result; // On updates with upsert:true, the inserted values come as a list of
    // upserted values -- even with options.multi, when the upsert does insert,
    // it only inserts one element.

    if (mongoResult.upserted) {
      meteorResult.numberAffected += mongoResult.upserted.length;

      if (mongoResult.upserted.length == 1) {
        meteorResult.insertedId = mongoResult.upserted[0]._id;
      }
    } else {
      meteorResult.numberAffected = mongoResult.n;
    }
  }

  return meteorResult;
};

var NUM_OPTIMISTIC_TRIES = 3; // exposed for testing

MongoConnection._isCannotChangeIdError = function (err) {
  // Mongo 3.2.* returns error as next Object:
  // {name: String, code: Number, errmsg: String}
  // Older Mongo returns:
  // {name: String, code: Number, err: String}
  var error = err.errmsg || err.err; // We don't use the error code here
  // because the error code we observed it producing (16837) appears to be
  // a far more generic error code based on examining the source.

  if (error.indexOf('The _id field cannot be changed') === 0 || error.indexOf("the (immutable) field '_id' was found to have been altered to _id") !== -1) {
    return true;
  }

  return false;
};

var simulateUpsertWithInsertedId = function (collection, selector, mod, options, callback) {
  // STRATEGY: First try doing an upsert with a generated ID.
  // If this throws an error about changing the ID on an existing document
  // then without affecting the database, we know we should probably try
  // an update without the generated ID. If it affected 0 documents, 
  // then without affecting the database, we the document that first
  // gave the error is probably removed and we need to try an insert again
  // We go back to step one and repeat.
  // Like all "optimistic write" schemes, we rely on the fact that it's
  // unlikely our writes will continue to be interfered with under normal
  // circumstances (though sufficiently heavy contention with writers
  // disagreeing on the existence of an object will cause writes to fail
  // in theory).
  var insertedId = options.insertedId; // must exist

  var mongoOptsForUpdate = {
    safe: true,
    multi: options.multi
  };
  var mongoOptsForInsert = {
    safe: true,
    upsert: true
  };
  var replacementWithId = Object.assign(replaceTypes({
    _id: insertedId
  }, replaceMeteorAtomWithMongo), mod);
  var tries = NUM_OPTIMISTIC_TRIES;

  var doUpdate = function () {
    tries--;

    if (!tries) {
      callback(new Error("Upsert failed after " + NUM_OPTIMISTIC_TRIES + " tries."));
    } else {
      collection.update(selector, mod, mongoOptsForUpdate, bindEnvironmentForWrite(function (err, result) {
        if (err) {
          callback(err);
        } else if (result && result.result.n != 0) {
          callback(null, {
            numberAffected: result.result.n
          });
        } else {
          doConditionalInsert();
        }
      }));
    }
  };

  var doConditionalInsert = function () {
    collection.update(selector, replacementWithId, mongoOptsForInsert, bindEnvironmentForWrite(function (err, result) {
      if (err) {
        // figure out if this is a
        // "cannot change _id of document" error, and
        // if so, try doUpdate() again, up to 3 times.
        if (MongoConnection._isCannotChangeIdError(err)) {
          doUpdate();
        } else {
          callback(err);
        }
      } else {
        callback(null, {
          numberAffected: result.result.upserted.length,
          insertedId: insertedId
        });
      }
    }));
  };

  doUpdate();
};

_.each(["insert", "update", "remove", "dropCollection", "dropDatabase"], function (method) {
  MongoConnection.prototype[method] = function () /* arguments */{
    var self = this;
    return Meteor.wrapAsync(self["_" + method]).apply(self, arguments);
  };
}); // XXX MongoConnection.upsert() does not return the id of the inserted document
// unless you set it explicitly in the selector or modifier (as a replacement
// doc).


MongoConnection.prototype.upsert = function (collectionName, selector, mod, options, callback) {
  var self = this;

  if (typeof options === "function" && !callback) {
    callback = options;
    options = {};
  }

  return self.update(collectionName, selector, mod, _.extend({}, options, {
    upsert: true,
    _returnObject: true
  }), callback);
};

MongoConnection.prototype.find = function (collectionName, selector, options) {
  var self = this;
  if (arguments.length === 1) selector = {};
  return new Cursor(self, new CursorDescription(collectionName, selector, options));
};

MongoConnection.prototype.findOne = function (collection_name, selector, options) {
  var self = this;
  if (arguments.length === 1) selector = {};
  options = options || {};
  options.limit = 1;
  return self.find(collection_name, selector, options).fetch()[0];
}; // We'll actually design an index API later. For now, we just pass through to
// Mongo's, but make it synchronous.


MongoConnection.prototype._ensureIndex = function (collectionName, index, options) {
  var self = this; // We expect this function to be called at startup, not from within a method,
  // so we don't interact with the write fence.

  var collection = self.rawCollection(collectionName);
  var future = new Future();
  var indexName = collection.ensureIndex(index, options, future.resolver());
  future.wait();
};

MongoConnection.prototype._dropIndex = function (collectionName, index) {
  var self = this; // This function is only used by test code, not within a method, so we don't
  // interact with the write fence.

  var collection = self.rawCollection(collectionName);
  var future = new Future();
  var indexName = collection.dropIndex(index, future.resolver());
  future.wait();
}; // CURSORS
// There are several classes which relate to cursors:
//
// CursorDescription represents the arguments used to construct a cursor:
// collectionName, selector, and (find) options.  Because it is used as a key
// for cursor de-dup, everything in it should either be JSON-stringifiable or
// not affect observeChanges output (eg, options.transform functions are not
// stringifiable but do not affect observeChanges).
//
// SynchronousCursor is a wrapper around a MongoDB cursor
// which includes fully-synchronous versions of forEach, etc.
//
// Cursor is the cursor object returned from find(), which implements the
// documented Mongo.Collection cursor API.  It wraps a CursorDescription and a
// SynchronousCursor (lazily: it doesn't contact Mongo until you call a method
// like fetch or forEach on it).
//
// ObserveHandle is the "observe handle" returned from observeChanges. It has a
// reference to an ObserveMultiplexer.
//
// ObserveMultiplexer allows multiple identical ObserveHandles to be driven by a
// single observe driver.
//
// There are two "observe drivers" which drive ObserveMultiplexers:
//   - PollingObserveDriver caches the results of a query and reruns it when
//     necessary.
//   - OplogObserveDriver follows the Mongo operation log to directly observe
//     database changes.
// Both implementations follow the same simple interface: when you create them,
// they start sending observeChanges callbacks (and a ready() invocation) to
// their ObserveMultiplexer, and you stop them by calling their stop() method.


CursorDescription = function (collectionName, selector, options) {
  var self = this;
  self.collectionName = collectionName;
  self.selector = Mongo.Collection._rewriteSelector(selector);
  self.options = options || {};
};

Cursor = function (mongo, cursorDescription) {
  var self = this;
  self._mongo = mongo;
  self._cursorDescription = cursorDescription;
  self._synchronousCursor = null;
};

_.each(['forEach', 'map', 'fetch', 'count'], function (method) {
  Cursor.prototype[method] = function () {
    var self = this; // You can only observe a tailable cursor.

    if (self._cursorDescription.options.tailable) throw new Error("Cannot call " + method + " on a tailable cursor");

    if (!self._synchronousCursor) {
      self._synchronousCursor = self._mongo._createSynchronousCursor(self._cursorDescription, {
        // Make sure that the "self" argument to forEach/map callbacks is the
        // Cursor, not the SynchronousCursor.
        selfForIteration: self,
        useTransform: true
      });
    }

    return self._synchronousCursor[method].apply(self._synchronousCursor, arguments);
  };
}); // Since we don't actually have a "nextObject" interface, there's really no
// reason to have a "rewind" interface.  All it did was make multiple calls
// to fetch/map/forEach return nothing the second time.
// XXX COMPAT WITH 0.8.1


Cursor.prototype.rewind = function () {};

Cursor.prototype.getTransform = function () {
  return this._cursorDescription.options.transform;
}; // When you call Meteor.publish() with a function that returns a Cursor, we need
// to transmute it into the equivalent subscription.  This is the function that
// does that.


Cursor.prototype._publishCursor = function (sub) {
  var self = this;
  var collection = self._cursorDescription.collectionName;
  return Mongo.Collection._publishCursor(self, sub, collection);
}; // Used to guarantee that publish functions return at most one cursor per
// collection. Private, because we might later have cursors that include
// documents from multiple collections somehow.


Cursor.prototype._getCollectionName = function () {
  var self = this;
  return self._cursorDescription.collectionName;
};

Cursor.prototype.observe = function (callbacks) {
  var self = this;
  return LocalCollection._observeFromObserveChanges(self, callbacks);
};

Cursor.prototype.observeChanges = function (callbacks) {
  var self = this;
  var methods = ['addedAt', 'added', 'changedAt', 'changed', 'removedAt', 'removed', 'movedTo'];

  var ordered = LocalCollection._observeChangesCallbacksAreOrdered(callbacks); // XXX: Can we find out if callbacks are from observe?


  var exceptionName = ' observe/observeChanges callback';
  methods.forEach(function (method) {
    if (callbacks[method] && typeof callbacks[method] == "function") {
      callbacks[method] = Meteor.bindEnvironment(callbacks[method], method + exceptionName);
    }
  });
  return self._mongo._observeChanges(self._cursorDescription, ordered, callbacks);
};

MongoConnection.prototype._createSynchronousCursor = function (cursorDescription, options) {
  var self = this;
  options = _.pick(options || {}, 'selfForIteration', 'useTransform');
  var collection = self.rawCollection(cursorDescription.collectionName);
  var cursorOptions = cursorDescription.options;
  var mongoOptions = {
    sort: cursorOptions.sort,
    limit: cursorOptions.limit,
    skip: cursorOptions.skip
  }; // Do we want a tailable cursor (which only works on capped collections)?

  if (cursorOptions.tailable) {
    // We want a tailable cursor...
    mongoOptions.tailable = true; // ... and for the server to wait a bit if any getMore has no data (rather
    // than making us put the relevant sleeps in the client)...

    mongoOptions.awaitdata = true; // ... and to keep querying the server indefinitely rather than just 5 times
    // if there's no more data.

    mongoOptions.numberOfRetries = -1; // And if this is on the oplog collection and the cursor specifies a 'ts',
    // then set the undocumented oplog replay flag, which does a special scan to
    // find the first document (instead of creating an index on ts). This is a
    // very hard-coded Mongo flag which only works on the oplog collection and
    // only works with the ts field.

    if (cursorDescription.collectionName === OPLOG_COLLECTION && cursorDescription.selector.ts) {
      mongoOptions.oplogReplay = true;
    }
  }

  var dbCursor = collection.find(replaceTypes(cursorDescription.selector, replaceMeteorAtomWithMongo), cursorOptions.fields, mongoOptions);

  if (typeof cursorOptions.maxTimeMs !== 'undefined') {
    dbCursor = dbCursor.maxTimeMS(cursorOptions.maxTimeMs);
  }

  if (typeof cursorOptions.hint !== 'undefined') {
    dbCursor = dbCursor.hint(cursorOptions.hint);
  }

  return new SynchronousCursor(dbCursor, cursorDescription, options);
};

var SynchronousCursor = function (dbCursor, cursorDescription, options) {
  var self = this;
  options = _.pick(options || {}, 'selfForIteration', 'useTransform');
  self._dbCursor = dbCursor;
  self._cursorDescription = cursorDescription; // The "self" argument passed to forEach/map callbacks. If we're wrapped
  // inside a user-visible Cursor, we want to provide the outer cursor!

  self._selfForIteration = options.selfForIteration || self;

  if (options.useTransform && cursorDescription.options.transform) {
    self._transform = LocalCollection.wrapTransform(cursorDescription.options.transform);
  } else {
    self._transform = null;
  } // Need to specify that the callback is the first argument to nextObject,
  // since otherwise when we try to call it with no args the driver will
  // interpret "undefined" first arg as an options hash and crash.


  self._synchronousNextObject = Future.wrap(dbCursor.nextObject.bind(dbCursor), 0);
  self._synchronousCount = Future.wrap(dbCursor.count.bind(dbCursor));
  self._visitedIds = new LocalCollection._IdMap();
};

_.extend(SynchronousCursor.prototype, {
  _nextObject: function () {
    var self = this;

    while (true) {
      var doc = self._synchronousNextObject().wait();

      if (!doc) return null;
      doc = replaceTypes(doc, replaceMongoAtomWithMeteor);

      if (!self._cursorDescription.options.tailable && _.has(doc, '_id')) {
        // Did Mongo give us duplicate documents in the same cursor? If so,
        // ignore this one. (Do this before the transform, since transform might
        // return some unrelated value.) We don't do this for tailable cursors,
        // because we want to maintain O(1) memory usage. And if there isn't _id
        // for some reason (maybe it's the oplog), then we don't do this either.
        // (Be careful to do this for falsey but existing _id, though.)
        if (self._visitedIds.has(doc._id)) continue;

        self._visitedIds.set(doc._id, true);
      }

      if (self._transform) doc = self._transform(doc);
      return doc;
    }
  },
  forEach: function (callback, thisArg) {
    var self = this; // Get back to the beginning.

    self._rewind(); // We implement the loop ourself instead of using self._dbCursor.each,
    // because "each" will call its callback outside of a fiber which makes it
    // much more complex to make this function synchronous.


    var index = 0;

    while (true) {
      var doc = self._nextObject();

      if (!doc) return;
      callback.call(thisArg, doc, index++, self._selfForIteration);
    }
  },
  // XXX Allow overlapping callback executions if callback yields.
  map: function (callback, thisArg) {
    var self = this;
    var res = [];
    self.forEach(function (doc, index) {
      res.push(callback.call(thisArg, doc, index, self._selfForIteration));
    });
    return res;
  },
  _rewind: function () {
    var self = this; // known to be synchronous

    self._dbCursor.rewind();

    self._visitedIds = new LocalCollection._IdMap();
  },
  // Mostly usable for tailable cursors.
  close: function () {
    var self = this;

    self._dbCursor.close();
  },
  fetch: function () {
    var self = this;
    return self.map(_.identity);
  },
  count: function (applySkipLimit = false) {
    var self = this;
    return self._synchronousCount(applySkipLimit).wait();
  },
  // This method is NOT wrapped in Cursor.
  getRawObjects: function (ordered) {
    var self = this;

    if (ordered) {
      return self.fetch();
    } else {
      var results = new LocalCollection._IdMap();
      self.forEach(function (doc) {
        results.set(doc._id, doc);
      });
      return results;
    }
  }
});

MongoConnection.prototype.tail = function (cursorDescription, docCallback) {
  var self = this;
  if (!cursorDescription.options.tailable) throw new Error("Can only tail a tailable cursor");

  var cursor = self._createSynchronousCursor(cursorDescription);

  var stopped = false;
  var lastTS;

  var loop = function () {
    var doc = null;

    while (true) {
      if (stopped) return;

      try {
        doc = cursor._nextObject();
      } catch (err) {
        // There's no good way to figure out if this was actually an error
        // from Mongo. Ah well. But either way, we need to retry the cursor
        // (unless the failure was because the observe got stopped).
        doc = null;
      } // Since cursor._nextObject can yield, we need to check again to see if
      // we've been stopped before calling the callback.


      if (stopped) return;

      if (doc) {
        // If a tailable cursor contains a "ts" field, use it to recreate the
        // cursor on error. ("ts" is a standard that Mongo uses internally for
        // the oplog, and there's a special flag that lets you do binary search
        // on it instead of needing to use an index.)
        lastTS = doc.ts;
        docCallback(doc);
      } else {
        var newSelector = _.clone(cursorDescription.selector);

        if (lastTS) {
          newSelector.ts = {
            $gt: lastTS
          };
        }

        cursor = self._createSynchronousCursor(new CursorDescription(cursorDescription.collectionName, newSelector, cursorDescription.options)); // Mongo failover takes many seconds.  Retry in a bit.  (Without this
        // setTimeout, we peg the CPU at 100% and never notice the actual
        // failover.

        Meteor.setTimeout(loop, 100);
        break;
      }
    }
  };

  Meteor.defer(loop);
  return {
    stop: function () {
      stopped = true;
      cursor.close();
    }
  };
};

MongoConnection.prototype._observeChanges = function (cursorDescription, ordered, callbacks) {
  var self = this;

  if (cursorDescription.options.tailable) {
    return self._observeChangesTailable(cursorDescription, ordered, callbacks);
  } // You may not filter out _id when observing changes, because the id is a core
  // part of the observeChanges API.


  if (cursorDescription.options.fields && (cursorDescription.options.fields._id === 0 || cursorDescription.options.fields._id === false)) {
    throw Error("You may not observe a cursor with {fields: {_id: 0}}");
  }

  var observeKey = EJSON.stringify(_.extend({
    ordered: ordered
  }, cursorDescription));
  var multiplexer, observeDriver;
  var firstHandle = false; // Find a matching ObserveMultiplexer, or create a new one. This next block is
  // guaranteed to not yield (and it doesn't call anything that can observe a
  // new query), so no other calls to this function can interleave with it.

  Meteor._noYieldsAllowed(function () {
    if (_.has(self._observeMultiplexers, observeKey)) {
      multiplexer = self._observeMultiplexers[observeKey];
    } else {
      firstHandle = true; // Create a new ObserveMultiplexer.

      multiplexer = new ObserveMultiplexer({
        ordered: ordered,
        onStop: function () {
          delete self._observeMultiplexers[observeKey];
          observeDriver.stop();
        }
      });
      self._observeMultiplexers[observeKey] = multiplexer;
    }
  });

  var observeHandle = new ObserveHandle(multiplexer, callbacks);

  if (firstHandle) {
    var matcher, sorter;

    var canUseOplog = _.all([function () {
      // At a bare minimum, using the oplog requires us to have an oplog, to
      // want unordered callbacks, and to not want a callback on the polls
      // that won't happen.
      return self._oplogHandle && !ordered && !callbacks._testOnlyPollCallback;
    }, function () {
      // We need to be able to compile the selector. Fall back to polling for
      // some newfangled $selector that minimongo doesn't support yet.
      try {
        matcher = new Minimongo.Matcher(cursorDescription.selector);
        return true;
      } catch (e) {
        // XXX make all compilation errors MinimongoError or something
        //     so that this doesn't ignore unrelated exceptions
        return false;
      }
    }, function () {
      // ... and the selector itself needs to support oplog.
      return OplogObserveDriver.cursorSupported(cursorDescription, matcher);
    }, function () {
      // And we need to be able to compile the sort, if any.  eg, can't be
      // {$natural: 1}.
      if (!cursorDescription.options.sort) return true;

      try {
        sorter = new Minimongo.Sorter(cursorDescription.options.sort, {
          matcher: matcher
        });
        return true;
      } catch (e) {
        // XXX make all compilation errors MinimongoError or something
        //     so that this doesn't ignore unrelated exceptions
        return false;
      }
    }], function (f) {
      return f();
    }); // invoke each function


    var driverClass = canUseOplog ? OplogObserveDriver : PollingObserveDriver;
    observeDriver = new driverClass({
      cursorDescription: cursorDescription,
      mongoHandle: self,
      multiplexer: multiplexer,
      ordered: ordered,
      matcher: matcher,
      // ignored by polling
      sorter: sorter,
      // ignored by polling
      _testOnlyPollCallback: callbacks._testOnlyPollCallback
    }); // This field is only set for use in tests.

    multiplexer._observeDriver = observeDriver;
  } // Blocks until the initial adds have been sent.


  multiplexer.addHandleAndSendInitialAdds(observeHandle);
  return observeHandle;
}; // Listen for the invalidation messages that will trigger us to poll the
// database for changes. If this selector specifies specific IDs, specify them
// here, so that updates to different specific IDs don't cause us to poll.
// listenCallback is the same kind of (notification, complete) callback passed
// to InvalidationCrossbar.listen.


listenAll = function (cursorDescription, listenCallback) {
  var listeners = [];
  forEachTrigger(cursorDescription, function (trigger) {
    listeners.push(DDPServer._InvalidationCrossbar.listen(trigger, listenCallback));
  });
  return {
    stop: function () {
      _.each(listeners, function (listener) {
        listener.stop();
      });
    }
  };
};

forEachTrigger = function (cursorDescription, triggerCallback) {
  var key = {
    collection: cursorDescription.collectionName
  };

  var specificIds = LocalCollection._idsMatchedBySelector(cursorDescription.selector);

  if (specificIds) {
    _.each(specificIds, function (id) {
      triggerCallback(_.extend({
        id: id
      }, key));
    });

    triggerCallback(_.extend({
      dropCollection: true,
      id: null
    }, key));
  } else {
    triggerCallback(key);
  } // Everyone cares about the database being dropped.


  triggerCallback({
    dropDatabase: true
  });
}; // observeChanges for tailable cursors on capped collections.
//
// Some differences from normal cursors:
//   - Will never produce anything other than 'added' or 'addedBefore'. If you
//     do update a document that has already been produced, this will not notice
//     it.
//   - If you disconnect and reconnect from Mongo, it will essentially restart
//     the query, which will lead to duplicate results. This is pretty bad,
//     but if you include a field called 'ts' which is inserted as
//     new MongoInternals.MongoTimestamp(0, 0) (which is initialized to the
//     current Mongo-style timestamp), we'll be able to find the place to
//     restart properly. (This field is specifically understood by Mongo with an
//     optimization which allows it to find the right place to start without
//     an index on ts. It's how the oplog works.)
//   - No callbacks are triggered synchronously with the call (there's no
//     differentiation between "initial data" and "later changes"; everything
//     that matches the query gets sent asynchronously).
//   - De-duplication is not implemented.
//   - Does not yet interact with the write fence. Probably, this should work by
//     ignoring removes (which don't work on capped collections) and updates
//     (which don't affect tailable cursors), and just keeping track of the ID
//     of the inserted object, and closing the write fence once you get to that
//     ID (or timestamp?).  This doesn't work well if the document doesn't match
//     the query, though.  On the other hand, the write fence can close
//     immediately if it does not match the query. So if we trust minimongo
//     enough to accurately evaluate the query against the write fence, we
//     should be able to do this...  Of course, minimongo doesn't even support
//     Mongo Timestamps yet.


MongoConnection.prototype._observeChangesTailable = function (cursorDescription, ordered, callbacks) {
  var self = this; // Tailable cursors only ever call added/addedBefore callbacks, so it's an
  // error if you didn't provide them.

  if (ordered && !callbacks.addedBefore || !ordered && !callbacks.added) {
    throw new Error("Can't observe an " + (ordered ? "ordered" : "unordered") + " tailable cursor without a " + (ordered ? "addedBefore" : "added") + " callback");
  }

  return self.tail(cursorDescription, function (doc) {
    var id = doc._id;
    delete doc._id; // The ts is an implementation detail. Hide it.

    delete doc.ts;

    if (ordered) {
      callbacks.addedBefore(id, doc, null);
    } else {
      callbacks.added(id, doc);
    }
  });
}; // XXX We probably need to find a better way to expose this. Right now
// it's only used by tests, but in fact you need it in normal
// operation to interact with capped collections.


MongoInternals.MongoTimestamp = MongoDB.Timestamp;
MongoInternals.Connection = MongoConnection;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_tailing.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_tailing.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

OPLOG_COLLECTION = 'oplog.rs';
var TOO_FAR_BEHIND = process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000;

var showTS = function (ts) {
  return "Timestamp(" + ts.getHighBits() + ", " + ts.getLowBits() + ")";
};

idForOp = function (op) {
  if (op.op === 'd') return op.o._id;else if (op.op === 'i') return op.o._id;else if (op.op === 'u') return op.o2._id;else if (op.op === 'c') throw Error("Operator 'c' doesn't supply an object with id: " + EJSON.stringify(op));else throw Error("Unknown op: " + EJSON.stringify(op));
};

OplogHandle = function (oplogUrl, dbName) {
  var self = this;
  self._oplogUrl = oplogUrl;
  self._dbName = dbName;
  self._oplogLastEntryConnection = null;
  self._oplogTailConnection = null;
  self._stopped = false;
  self._tailHandle = null;
  self._readyFuture = new Future();
  self._crossbar = new DDPServer._Crossbar({
    factPackage: "mongo-livedata",
    factName: "oplog-watchers"
  });
  self._baseOplogSelector = {
    ns: new RegExp('^' + Meteor._escapeRegExp(self._dbName) + '\\.'),
    $or: [{
      op: {
        $in: ['i', 'u', 'd']
      }
    }, // drop collection
    {
      op: 'c',
      'o.drop': {
        $exists: true
      }
    }, {
      op: 'c',
      'o.dropDatabase': 1
    }]
  }; // Data structures to support waitUntilCaughtUp(). Each oplog entry has a
  // MongoTimestamp object on it (which is not the same as a Date --- it's a
  // combination of time and an incrementing counter; see
  // http://docs.mongodb.org/manual/reference/bson-types/#timestamps).
  //
  // _catchingUpFutures is an array of {ts: MongoTimestamp, future: Future}
  // objects, sorted by ascending timestamp. _lastProcessedTS is the
  // MongoTimestamp of the last oplog entry we've processed.
  //
  // Each time we call waitUntilCaughtUp, we take a peek at the final oplog
  // entry in the db.  If we've already processed it (ie, it is not greater than
  // _lastProcessedTS), waitUntilCaughtUp immediately returns. Otherwise,
  // waitUntilCaughtUp makes a new Future and inserts it along with the final
  // timestamp entry that it read, into _catchingUpFutures. waitUntilCaughtUp
  // then waits on that future, which is resolved once _lastProcessedTS is
  // incremented to be past its timestamp by the worker fiber.
  //
  // XXX use a priority queue or something else that's faster than an array

  self._catchingUpFutures = [];
  self._lastProcessedTS = null;
  self._onSkippedEntriesHook = new Hook({
    debugPrintExceptions: "onSkippedEntries callback"
  });
  self._entryQueue = new Meteor._DoubleEndedQueue();
  self._workerActive = false;

  self._startTailing();
};

_.extend(OplogHandle.prototype, {
  stop: function () {
    var self = this;
    if (self._stopped) return;
    self._stopped = true;
    if (self._tailHandle) self._tailHandle.stop(); // XXX should close connections too
  },
  onOplogEntry: function (trigger, callback) {
    var self = this;
    if (self._stopped) throw new Error("Called onOplogEntry on stopped handle!"); // Calling onOplogEntry requires us to wait for the tailing to be ready.

    self._readyFuture.wait();

    var originalCallback = callback;
    callback = Meteor.bindEnvironment(function (notification) {
      // XXX can we avoid this clone by making oplog.js careful?
      originalCallback(EJSON.clone(notification));
    }, function (err) {
      Meteor._debug("Error in oplog callback", err.stack);
    });

    var listenHandle = self._crossbar.listen(trigger, callback);

    return {
      stop: function () {
        listenHandle.stop();
      }
    };
  },
  // Register a callback to be invoked any time we skip oplog entries (eg,
  // because we are too far behind).
  onSkippedEntries: function (callback) {
    var self = this;
    if (self._stopped) throw new Error("Called onSkippedEntries on stopped handle!");
    return self._onSkippedEntriesHook.register(callback);
  },
  // Calls `callback` once the oplog has been processed up to a point that is
  // roughly "now": specifically, once we've processed all ops that are
  // currently visible.
  // XXX become convinced that this is actually safe even if oplogConnection
  // is some kind of pool
  waitUntilCaughtUp: function () {
    var self = this;
    if (self._stopped) throw new Error("Called waitUntilCaughtUp on stopped handle!"); // Calling waitUntilCaughtUp requries us to wait for the oplog connection to
    // be ready.

    self._readyFuture.wait();

    var lastEntry;

    while (!self._stopped) {
      // We need to make the selector at least as restrictive as the actual
      // tailing selector (ie, we need to specify the DB name) or else we might
      // find a TS that won't show up in the actual tail stream.
      try {
        lastEntry = self._oplogLastEntryConnection.findOne(OPLOG_COLLECTION, self._baseOplogSelector, {
          fields: {
            ts: 1
          },
          sort: {
            $natural: -1
          }
        });
        break;
      } catch (e) {
        // During failover (eg) if we get an exception we should log and retry
        // instead of crashing.
        Meteor._debug("Got exception while reading last entry: " + e);

        Meteor._sleepForMs(100);
      }
    }

    if (self._stopped) return;

    if (!lastEntry) {
      // Really, nothing in the oplog? Well, we've processed everything.
      return;
    }

    var ts = lastEntry.ts;
    if (!ts) throw Error("oplog entry without ts: " + EJSON.stringify(lastEntry));

    if (self._lastProcessedTS && ts.lessThanOrEqual(self._lastProcessedTS)) {
      // We've already caught up to here.
      return;
    } // Insert the future into our list. Almost always, this will be at the end,
    // but it's conceivable that if we fail over from one primary to another,
    // the oplog entries we see will go backwards.


    var insertAfter = self._catchingUpFutures.length;

    while (insertAfter - 1 > 0 && self._catchingUpFutures[insertAfter - 1].ts.greaterThan(ts)) {
      insertAfter--;
    }

    var f = new Future();

    self._catchingUpFutures.splice(insertAfter, 0, {
      ts: ts,
      future: f
    });

    f.wait();
  },
  _startTailing: function () {
    var self = this; // First, make sure that we're talking to the local database.

    var mongodbUri = Npm.require('mongodb-uri');

    if (mongodbUri.parse(self._oplogUrl).database !== 'local') {
      throw Error("$MONGO_OPLOG_URL must be set to the 'local' database of " + "a Mongo replica set");
    } // We make two separate connections to Mongo. The Node Mongo driver
    // implements a naive round-robin connection pool: each "connection" is a
    // pool of several (5 by default) TCP connections, and each request is
    // rotated through the pools. Tailable cursor queries block on the server
    // until there is some data to return (or until a few seconds have
    // passed). So if the connection pool used for tailing cursors is the same
    // pool used for other queries, the other queries will be delayed by seconds
    // 1/5 of the time.
    //
    // The tail connection will only ever be running a single tail command, so
    // it only needs to make one underlying TCP connection.


    self._oplogTailConnection = new MongoConnection(self._oplogUrl, {
      poolSize: 1
    }); // XXX better docs, but: it's to get monotonic results
    // XXX is it safe to say "if there's an in flight query, just use its
    //     results"? I don't think so but should consider that

    self._oplogLastEntryConnection = new MongoConnection(self._oplogUrl, {
      poolSize: 1
    }); // Now, make sure that there actually is a repl set here. If not, oplog
    // tailing won't ever find anything!
    // More on the isMasterDoc
    // https://docs.mongodb.com/manual/reference/command/isMaster/

    var f = new Future();

    self._oplogLastEntryConnection.db.admin().command({
      ismaster: 1
    }, f.resolver());

    var isMasterDoc = f.wait();

    if (!(isMasterDoc && isMasterDoc.setName)) {
      throw Error("$MONGO_OPLOG_URL must be set to the 'local' database of " + "a Mongo replica set");
    } // Find the last oplog entry.


    var lastOplogEntry = self._oplogLastEntryConnection.findOne(OPLOG_COLLECTION, {}, {
      sort: {
        $natural: -1
      },
      fields: {
        ts: 1
      }
    });

    var oplogSelector = _.clone(self._baseOplogSelector);

    if (lastOplogEntry) {
      // Start after the last entry that currently exists.
      oplogSelector.ts = {
        $gt: lastOplogEntry.ts
      }; // If there are any calls to callWhenProcessedLatest before any other
      // oplog entries show up, allow callWhenProcessedLatest to call its
      // callback immediately.

      self._lastProcessedTS = lastOplogEntry.ts;
    }

    var cursorDescription = new CursorDescription(OPLOG_COLLECTION, oplogSelector, {
      tailable: true
    });
    self._tailHandle = self._oplogTailConnection.tail(cursorDescription, function (doc) {
      self._entryQueue.push(doc);

      self._maybeStartWorker();
    });

    self._readyFuture.return();
  },
  _maybeStartWorker: function () {
    var self = this;
    if (self._workerActive) return;
    self._workerActive = true;
    Meteor.defer(function () {
      try {
        while (!self._stopped && !self._entryQueue.isEmpty()) {
          // Are we too far behind? Just tell our observers that they need to
          // repoll, and drop our queue.
          if (self._entryQueue.length > TOO_FAR_BEHIND) {
            var lastEntry = self._entryQueue.pop();

            self._entryQueue.clear();

            self._onSkippedEntriesHook.each(function (callback) {
              callback();
              return true;
            }); // Free any waitUntilCaughtUp() calls that were waiting for us to
            // pass something that we just skipped.


            self._setLastProcessedTS(lastEntry.ts);

            continue;
          }

          var doc = self._entryQueue.shift();

          if (!(doc.ns && doc.ns.length > self._dbName.length + 1 && doc.ns.substr(0, self._dbName.length + 1) === self._dbName + '.')) {
            throw new Error("Unexpected ns");
          }

          var trigger = {
            collection: doc.ns.substr(self._dbName.length + 1),
            dropCollection: false,
            dropDatabase: false,
            op: doc
          }; // Is it a special command and the collection name is hidden somewhere
          // in operator?

          if (trigger.collection === "$cmd") {
            if (doc.o.dropDatabase) {
              delete trigger.collection;
              trigger.dropDatabase = true;
            } else if (_.has(doc.o, 'drop')) {
              trigger.collection = doc.o.drop;
              trigger.dropCollection = true;
              trigger.id = null;
            } else {
              throw Error("Unknown command " + JSON.stringify(doc));
            }
          } else {
            // All other ops have an id.
            trigger.id = idForOp(doc);
          }

          self._crossbar.fire(trigger); // Now that we've processed this operation, process pending
          // sequencers.


          if (!doc.ts) throw Error("oplog entry without ts: " + EJSON.stringify(doc));

          self._setLastProcessedTS(doc.ts);
        }
      } finally {
        self._workerActive = false;
      }
    });
  },
  _setLastProcessedTS: function (ts) {
    var self = this;
    self._lastProcessedTS = ts;

    while (!_.isEmpty(self._catchingUpFutures) && self._catchingUpFutures[0].ts.lessThanOrEqual(self._lastProcessedTS)) {
      var sequencer = self._catchingUpFutures.shift();

      sequencer.future.return();
    }
  },
  //Methods used on tests to dinamically change TOO_FAR_BEHIND
  _defineTooFarBehind: function (value) {
    TOO_FAR_BEHIND = value;
  },
  _resetTooFarBehind: function () {
    TOO_FAR_BEHIND = process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_multiplex.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/observe_multiplex.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

ObserveMultiplexer = function (options) {
  var self = this;
  if (!options || !_.has(options, 'ordered')) throw Error("must specified ordered");
  Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", 1);
  self._ordered = options.ordered;

  self._onStop = options.onStop || function () {};

  self._queue = new Meteor._SynchronousQueue();
  self._handles = {};
  self._readyFuture = new Future();
  self._cache = new LocalCollection._CachingChangeObserver({
    ordered: options.ordered
  }); // Number of addHandleAndSendInitialAdds tasks scheduled but not yet
  // running. removeHandle uses this to know if it's time to call the onStop
  // callback.

  self._addHandleTasksScheduledButNotPerformed = 0;

  _.each(self.callbackNames(), function (callbackName) {
    self[callbackName] = function () /* ... */{
      self._applyCallback(callbackName, _.toArray(arguments));
    };
  });
};

_.extend(ObserveMultiplexer.prototype, {
  addHandleAndSendInitialAdds: function (handle) {
    var self = this; // Check this before calling runTask (even though runTask does the same
    // check) so that we don't leak an ObserveMultiplexer on error by
    // incrementing _addHandleTasksScheduledButNotPerformed and never
    // decrementing it.

    if (!self._queue.safeToRunTask()) throw new Error("Can't call observeChanges from an observe callback on the same query");
    ++self._addHandleTasksScheduledButNotPerformed;
    Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-handles", 1);

    self._queue.runTask(function () {
      self._handles[handle._id] = handle; // Send out whatever adds we have so far (whether or not we the
      // multiplexer is ready).

      self._sendAdds(handle);

      --self._addHandleTasksScheduledButNotPerformed;
    }); // *outside* the task, since otherwise we'd deadlock


    self._readyFuture.wait();
  },
  // Remove an observe handle. If it was the last observe handle, call the
  // onStop callback; you cannot add any more observe handles after this.
  //
  // This is not synchronized with polls and handle additions: this means that
  // you can safely call it from within an observe callback, but it also means
  // that we have to be careful when we iterate over _handles.
  removeHandle: function (id) {
    var self = this; // This should not be possible: you can only call removeHandle by having
    // access to the ObserveHandle, which isn't returned to user code until the
    // multiplex is ready.

    if (!self._ready()) throw new Error("Can't remove handles until the multiplex is ready");
    delete self._handles[id];
    Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-handles", -1);

    if (_.isEmpty(self._handles) && self._addHandleTasksScheduledButNotPerformed === 0) {
      self._stop();
    }
  },
  _stop: function (options) {
    var self = this;
    options = options || {}; // It shouldn't be possible for us to stop when all our handles still
    // haven't been returned from observeChanges!

    if (!self._ready() && !options.fromQueryError) throw Error("surprising _stop: not ready"); // Call stop callback (which kills the underlying process which sends us
    // callbacks and removes us from the connection's dictionary).

    self._onStop();

    Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", -1); // Cause future addHandleAndSendInitialAdds calls to throw (but the onStop
    // callback should make our connection forget about us).

    self._handles = null;
  },
  // Allows all addHandleAndSendInitialAdds calls to return, once all preceding
  // adds have been processed. Does not block.
  ready: function () {
    var self = this;

    self._queue.queueTask(function () {
      if (self._ready()) throw Error("can't make ObserveMultiplex ready twice!");

      self._readyFuture.return();
    });
  },
  // If trying to execute the query results in an error, call this. This is
  // intended for permanent errors, not transient network errors that could be
  // fixed. It should only be called before ready(), because if you called ready
  // that meant that you managed to run the query once. It will stop this
  // ObserveMultiplex and cause addHandleAndSendInitialAdds calls (and thus
  // observeChanges calls) to throw the error.
  queryError: function (err) {
    var self = this;

    self._queue.runTask(function () {
      if (self._ready()) throw Error("can't claim query has an error after it worked!");

      self._stop({
        fromQueryError: true
      });

      self._readyFuture.throw(err);
    });
  },
  // Calls "cb" once the effects of all "ready", "addHandleAndSendInitialAdds"
  // and observe callbacks which came before this call have been propagated to
  // all handles. "ready" must have already been called on this multiplexer.
  onFlush: function (cb) {
    var self = this;

    self._queue.queueTask(function () {
      if (!self._ready()) throw Error("only call onFlush on a multiplexer that will be ready");
      cb();
    });
  },
  callbackNames: function () {
    var self = this;
    if (self._ordered) return ["addedBefore", "changed", "movedBefore", "removed"];else return ["added", "changed", "removed"];
  },
  _ready: function () {
    return this._readyFuture.isResolved();
  },
  _applyCallback: function (callbackName, args) {
    var self = this;

    self._queue.queueTask(function () {
      // If we stopped in the meantime, do nothing.
      if (!self._handles) return; // First, apply the change to the cache.
      // XXX We could make applyChange callbacks promise not to hang on to any
      // state from their arguments (assuming that their supplied callbacks
      // don't) and skip this clone. Currently 'changed' hangs on to state
      // though.

      self._cache.applyChange[callbackName].apply(null, EJSON.clone(args)); // If we haven't finished the initial adds, then we should only be getting
      // adds.


      if (!self._ready() && callbackName !== 'added' && callbackName !== 'addedBefore') {
        throw new Error("Got " + callbackName + " during initial adds");
      } // Now multiplex the callbacks out to all observe handles. It's OK if
      // these calls yield; since we're inside a task, no other use of our queue
      // can continue until these are done. (But we do have to be careful to not
      // use a handle that got removed, because removeHandle does not use the
      // queue; thus, we iterate over an array of keys that we control.)


      _.each(_.keys(self._handles), function (handleId) {
        var handle = self._handles && self._handles[handleId];
        if (!handle) return;
        var callback = handle['_' + callbackName]; // clone arguments so that callbacks can mutate their arguments

        callback && callback.apply(null, EJSON.clone(args));
      });
    });
  },
  // Sends initial adds to a handle. It should only be called from within a task
  // (the task that is processing the addHandleAndSendInitialAdds call). It
  // synchronously invokes the handle's added or addedBefore; there's no need to
  // flush the queue afterwards to ensure that the callbacks get out.
  _sendAdds: function (handle) {
    var self = this;
    if (self._queue.safeToRunTask()) throw Error("_sendAdds may only be called from within a task!");
    var add = self._ordered ? handle._addedBefore : handle._added;
    if (!add) return; // note: docs may be an _IdMap or an OrderedDict

    self._cache.docs.forEach(function (doc, id) {
      if (!_.has(self._handles, handle._id)) throw Error("handle got removed before sending initial adds!");
      var fields = EJSON.clone(doc);
      delete fields._id;
      if (self._ordered) add(id, fields, null); // we're going in order, so add at end
      else add(id, fields);
    });
  }
});

var nextObserveHandleId = 1;

ObserveHandle = function (multiplexer, callbacks) {
  var self = this; // The end user is only supposed to call stop().  The other fields are
  // accessible to the multiplexer, though.

  self._multiplexer = multiplexer;

  _.each(multiplexer.callbackNames(), function (name) {
    if (callbacks[name]) {
      self['_' + name] = callbacks[name];
    } else if (name === "addedBefore" && callbacks.added) {
      // Special case: if you specify "added" and "movedBefore", you get an
      // ordered observe where for some reason you don't get ordering data on
      // the adds.  I dunno, we wrote tests for it, there must have been a
      // reason.
      self._addedBefore = function (id, fields, before) {
        callbacks.added(id, fields);
      };
    }
  });

  self._stopped = false;
  self._id = nextObserveHandleId++;
};

ObserveHandle.prototype.stop = function () {
  var self = this;
  if (self._stopped) return;
  self._stopped = true;

  self._multiplexer.removeHandle(self._id);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"doc_fetcher.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/doc_fetcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Fiber = Npm.require('fibers');

var Future = Npm.require('fibers/future');

DocFetcher = function (mongoConnection) {
  var self = this;
  self._mongoConnection = mongoConnection; // Map from cache key -> [callback]

  self._callbacksForCacheKey = {};
};

_.extend(DocFetcher.prototype, {
  // Fetches document "id" from collectionName, returning it or null if not
  // found.
  //
  // If you make multiple calls to fetch() with the same cacheKey (a string),
  // DocFetcher may assume that they all return the same document. (It does
  // not check to see if collectionName/id match.)
  //
  // You may assume that callback is never called synchronously (and in fact
  // OplogObserveDriver does so).
  fetch: function (collectionName, id, cacheKey, callback) {
    var self = this;
    check(collectionName, String); // id is some sort of scalar

    check(cacheKey, String); // If there's already an in-progress fetch for this cache key, yield until
    // it's done and return whatever it returns.

    if (_.has(self._callbacksForCacheKey, cacheKey)) {
      self._callbacksForCacheKey[cacheKey].push(callback);

      return;
    }

    var callbacks = self._callbacksForCacheKey[cacheKey] = [callback];
    Fiber(function () {
      try {
        var doc = self._mongoConnection.findOne(collectionName, {
          _id: id
        }) || null; // Return doc to all relevant callbacks. Note that this array can
        // continue to grow during callback excecution.

        while (!_.isEmpty(callbacks)) {
          // Clone the document so that the various calls to fetch don't return
          // objects that are intertwingled with each other. Clone before
          // popping the future, so that if clone throws, the error gets passed
          // to the next callback.
          var clonedDoc = EJSON.clone(doc);
          callbacks.pop()(null, clonedDoc);
        }
      } catch (e) {
        while (!_.isEmpty(callbacks)) {
          callbacks.pop()(e);
        }
      } finally {
        // XXX consider keeping the doc around for a period of time before
        // removing from the cache
        delete self._callbacksForCacheKey[cacheKey];
      }
    }).run();
  }
});

MongoTest.DocFetcher = DocFetcher;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"polling_observe_driver.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/polling_observe_driver.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
PollingObserveDriver = function (options) {
  var self = this;
  self._cursorDescription = options.cursorDescription;
  self._mongoHandle = options.mongoHandle;
  self._ordered = options.ordered;
  self._multiplexer = options.multiplexer;
  self._stopCallbacks = [];
  self._stopped = false;
  self._synchronousCursor = self._mongoHandle._createSynchronousCursor(self._cursorDescription); // previous results snapshot.  on each poll cycle, diffs against
  // results drives the callbacks.

  self._results = null; // The number of _pollMongo calls that have been added to self._taskQueue but
  // have not started running. Used to make sure we never schedule more than one
  // _pollMongo (other than possibly the one that is currently running). It's
  // also used by _suspendPolling to pretend there's a poll scheduled. Usually,
  // it's either 0 (for "no polls scheduled other than maybe one currently
  // running") or 1 (for "a poll scheduled that isn't running yet"), but it can
  // also be 2 if incremented by _suspendPolling.

  self._pollsScheduledButNotStarted = 0;
  self._pendingWrites = []; // people to notify when polling completes
  // Make sure to create a separately throttled function for each
  // PollingObserveDriver object.

  self._ensurePollIsScheduled = _.throttle(self._unthrottledEnsurePollIsScheduled, self._cursorDescription.options.pollingThrottleMs || 50 /* ms */); // XXX figure out if we still need a queue

  self._taskQueue = new Meteor._SynchronousQueue();
  var listenersHandle = listenAll(self._cursorDescription, function (notification) {
    // When someone does a transaction that might affect us, schedule a poll
    // of the database. If that transaction happens inside of a write fence,
    // block the fence until we've polled and notified observers.
    var fence = DDPServer._CurrentWriteFence.get();

    if (fence) self._pendingWrites.push(fence.beginWrite()); // Ensure a poll is scheduled... but if we already know that one is,
    // don't hit the throttled _ensurePollIsScheduled function (which might
    // lead to us calling it unnecessarily in <pollingThrottleMs> ms).

    if (self._pollsScheduledButNotStarted === 0) self._ensurePollIsScheduled();
  });

  self._stopCallbacks.push(function () {
    listenersHandle.stop();
  }); // every once and a while, poll even if we don't think we're dirty, for
  // eventual consistency with database writes from outside the Meteor
  // universe.
  //
  // For testing, there's an undocumented callback argument to observeChanges
  // which disables time-based polling and gets called at the beginning of each
  // poll.


  if (options._testOnlyPollCallback) {
    self._testOnlyPollCallback = options._testOnlyPollCallback;
  } else {
    var pollingInterval = self._cursorDescription.options.pollingIntervalMs || self._cursorDescription.options._pollingInterval || // COMPAT with 1.2
    10 * 1000;
    var intervalHandle = Meteor.setInterval(_.bind(self._ensurePollIsScheduled, self), pollingInterval);

    self._stopCallbacks.push(function () {
      Meteor.clearInterval(intervalHandle);
    });
  } // Make sure we actually poll soon!


  self._unthrottledEnsurePollIsScheduled();

  Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", 1);
};

_.extend(PollingObserveDriver.prototype, {
  // This is always called through _.throttle (except once at startup).
  _unthrottledEnsurePollIsScheduled: function () {
    var self = this;
    if (self._pollsScheduledButNotStarted > 0) return;
    ++self._pollsScheduledButNotStarted;

    self._taskQueue.queueTask(function () {
      self._pollMongo();
    });
  },
  // test-only interface for controlling polling.
  //
  // _suspendPolling blocks until any currently running and scheduled polls are
  // done, and prevents any further polls from being scheduled. (new
  // ObserveHandles can be added and receive their initial added callbacks,
  // though.)
  //
  // _resumePolling immediately polls, and allows further polls to occur.
  _suspendPolling: function () {
    var self = this; // Pretend that there's another poll scheduled (which will prevent
    // _ensurePollIsScheduled from queueing any more polls).

    ++self._pollsScheduledButNotStarted; // Now block until all currently running or scheduled polls are done.

    self._taskQueue.runTask(function () {}); // Confirm that there is only one "poll" (the fake one we're pretending to
    // have) scheduled.


    if (self._pollsScheduledButNotStarted !== 1) throw new Error("_pollsScheduledButNotStarted is " + self._pollsScheduledButNotStarted);
  },
  _resumePolling: function () {
    var self = this; // We should be in the same state as in the end of _suspendPolling.

    if (self._pollsScheduledButNotStarted !== 1) throw new Error("_pollsScheduledButNotStarted is " + self._pollsScheduledButNotStarted); // Run a poll synchronously (which will counteract the
    // ++_pollsScheduledButNotStarted from _suspendPolling).

    self._taskQueue.runTask(function () {
      self._pollMongo();
    });
  },
  _pollMongo: function () {
    var self = this;
    --self._pollsScheduledButNotStarted;
    if (self._stopped) return;
    var first = false;
    var newResults;
    var oldResults = self._results;

    if (!oldResults) {
      first = true; // XXX maybe use OrderedDict instead?

      oldResults = self._ordered ? [] : new LocalCollection._IdMap();
    }

    self._testOnlyPollCallback && self._testOnlyPollCallback(); // Save the list of pending writes which this round will commit.

    var writesForCycle = self._pendingWrites;
    self._pendingWrites = []; // Get the new query results. (This yields.)

    try {
      newResults = self._synchronousCursor.getRawObjects(self._ordered);
    } catch (e) {
      if (first && typeof e.code === 'number') {
        // This is an error document sent to us by mongod, not a connection
        // error generated by the client. And we've never seen this query work
        // successfully. Probably it's a bad selector or something, so we should
        // NOT retry. Instead, we should halt the observe (which ends up calling
        // `stop` on us).
        self._multiplexer.queryError(new Error("Exception while polling query " + JSON.stringify(self._cursorDescription) + ": " + e.message));

        return;
      } // getRawObjects can throw if we're having trouble talking to the
      // database.  That's fine --- we will repoll later anyway. But we should
      // make sure not to lose track of this cycle's writes.
      // (It also can throw if there's just something invalid about this query;
      // unfortunately the ObserveDriver API doesn't provide a good way to
      // "cancel" the observe from the inside in this case.


      Array.prototype.push.apply(self._pendingWrites, writesForCycle);

      Meteor._debug("Exception while polling query " + JSON.stringify(self._cursorDescription) + ": " + e.stack);

      return;
    } // Run diffs.


    if (!self._stopped) {
      LocalCollection._diffQueryChanges(self._ordered, oldResults, newResults, self._multiplexer);
    } // Signals the multiplexer to allow all observeChanges calls that share this
    // multiplexer to return. (This happens asynchronously, via the
    // multiplexer's queue.)


    if (first) self._multiplexer.ready(); // Replace self._results atomically.  (This assignment is what makes `first`
    // stay through on the next cycle, so we've waited until after we've
    // committed to ready-ing the multiplexer.)

    self._results = newResults; // Once the ObserveMultiplexer has processed everything we've done in this
    // round, mark all the writes which existed before this call as
    // commmitted. (If new writes have shown up in the meantime, there'll
    // already be another _pollMongo task scheduled.)

    self._multiplexer.onFlush(function () {
      _.each(writesForCycle, function (w) {
        w.committed();
      });
    });
  },
  stop: function () {
    var self = this;
    self._stopped = true;

    _.each(self._stopCallbacks, function (c) {
      c();
    }); // Release any write fences that are waiting on us.


    _.each(self._pendingWrites, function (w) {
      w.committed();
    });

    Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", -1);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_observe_driver.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_observe_driver.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

var PHASE = {
  QUERYING: "QUERYING",
  FETCHING: "FETCHING",
  STEADY: "STEADY"
}; // Exception thrown by _needToPollQuery which unrolls the stack up to the
// enclosing call to finishIfNeedToPollQuery.

var SwitchedToQuery = function () {};

var finishIfNeedToPollQuery = function (f) {
  return function () {
    try {
      f.apply(this, arguments);
    } catch (e) {
      if (!(e instanceof SwitchedToQuery)) throw e;
    }
  };
};

var currentId = 0; // OplogObserveDriver is an alternative to PollingObserveDriver which follows
// the Mongo operation log instead of just re-polling the query. It obeys the
// same simple interface: constructing it starts sending observeChanges
// callbacks (and a ready() invocation) to the ObserveMultiplexer, and you stop
// it by calling the stop() method.

OplogObserveDriver = function (options) {
  var self = this;
  self._usesOplog = true; // tests look at this

  self._id = currentId;
  currentId++;
  self._cursorDescription = options.cursorDescription;
  self._mongoHandle = options.mongoHandle;
  self._multiplexer = options.multiplexer;

  if (options.ordered) {
    throw Error("OplogObserveDriver only supports unordered observeChanges");
  }

  var sorter = options.sorter; // We don't support $near and other geo-queries so it's OK to initialize the
  // comparator only once in the constructor.

  var comparator = sorter && sorter.getComparator();

  if (options.cursorDescription.options.limit) {
    // There are several properties ordered driver implements:
    // - _limit is a positive number
    // - _comparator is a function-comparator by which the query is ordered
    // - _unpublishedBuffer is non-null Min/Max Heap,
    //                      the empty buffer in STEADY phase implies that the
    //                      everything that matches the queries selector fits
    //                      into published set.
    // - _published - Min Heap (also implements IdMap methods)
    var heapOptions = {
      IdMap: LocalCollection._IdMap
    };
    self._limit = self._cursorDescription.options.limit;
    self._comparator = comparator;
    self._sorter = sorter;
    self._unpublishedBuffer = new MinMaxHeap(comparator, heapOptions); // We need something that can find Max value in addition to IdMap interface

    self._published = new MaxHeap(comparator, heapOptions);
  } else {
    self._limit = 0;
    self._comparator = null;
    self._sorter = null;
    self._unpublishedBuffer = null;
    self._published = new LocalCollection._IdMap();
  } // Indicates if it is safe to insert a new document at the end of the buffer
  // for this query. i.e. it is known that there are no documents matching the
  // selector those are not in published or buffer.


  self._safeAppendToBuffer = false;
  self._stopped = false;
  self._stopHandles = [];
  Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", 1);

  self._registerPhaseChange(PHASE.QUERYING);

  self._matcher = options.matcher;
  var projection = self._cursorDescription.options.fields || {};
  self._projectionFn = LocalCollection._compileProjection(projection); // Projection function, result of combining important fields for selector and
  // existing fields projection

  self._sharedProjection = self._matcher.combineIntoProjection(projection);
  if (sorter) self._sharedProjection = sorter.combineIntoProjection(self._sharedProjection);
  self._sharedProjectionFn = LocalCollection._compileProjection(self._sharedProjection);
  self._needToFetch = new LocalCollection._IdMap();
  self._currentlyFetching = null;
  self._fetchGeneration = 0;
  self._requeryWhenDoneThisQuery = false;
  self._writesToCommitWhenWeReachSteady = []; // If the oplog handle tells us that it skipped some entries (because it got
  // behind, say), re-poll.

  self._stopHandles.push(self._mongoHandle._oplogHandle.onSkippedEntries(finishIfNeedToPollQuery(function () {
    self._needToPollQuery();
  })));

  forEachTrigger(self._cursorDescription, function (trigger) {
    self._stopHandles.push(self._mongoHandle._oplogHandle.onOplogEntry(trigger, function (notification) {
      Meteor._noYieldsAllowed(finishIfNeedToPollQuery(function () {
        var op = notification.op;

        if (notification.dropCollection || notification.dropDatabase) {
          // Note: this call is not allowed to block on anything (especially
          // on waiting for oplog entries to catch up) because that will block
          // onOplogEntry!
          self._needToPollQuery();
        } else {
          // All other operators should be handled depending on phase
          if (self._phase === PHASE.QUERYING) {
            self._handleOplogEntryQuerying(op);
          } else {
            self._handleOplogEntrySteadyOrFetching(op);
          }
        }
      }));
    }));
  }); // XXX ordering w.r.t. everything else?

  self._stopHandles.push(listenAll(self._cursorDescription, function (notification) {
    // If we're not in a pre-fire write fence, we don't have to do anything.
    var fence = DDPServer._CurrentWriteFence.get();

    if (!fence || fence.fired) return;

    if (fence._oplogObserveDrivers) {
      fence._oplogObserveDrivers[self._id] = self;
      return;
    }

    fence._oplogObserveDrivers = {};
    fence._oplogObserveDrivers[self._id] = self;
    fence.onBeforeFire(function () {
      var drivers = fence._oplogObserveDrivers;
      delete fence._oplogObserveDrivers; // This fence cannot fire until we've caught up to "this point" in the
      // oplog, and all observers made it back to the steady state.

      self._mongoHandle._oplogHandle.waitUntilCaughtUp();

      _.each(drivers, function (driver) {
        if (driver._stopped) return;
        var write = fence.beginWrite();

        if (driver._phase === PHASE.STEADY) {
          // Make sure that all of the callbacks have made it through the
          // multiplexer and been delivered to ObserveHandles before committing
          // writes.
          driver._multiplexer.onFlush(function () {
            write.committed();
          });
        } else {
          driver._writesToCommitWhenWeReachSteady.push(write);
        }
      });
    });
  })); // When Mongo fails over, we need to repoll the query, in case we processed an
  // oplog entry that got rolled back.


  self._stopHandles.push(self._mongoHandle._onFailover(finishIfNeedToPollQuery(function () {
    self._needToPollQuery();
  }))); // Give _observeChanges a chance to add the new ObserveHandle to our
  // multiplexer, so that the added calls get streamed.


  Meteor.defer(finishIfNeedToPollQuery(function () {
    self._runInitialQuery();
  }));
};

_.extend(OplogObserveDriver.prototype, {
  _addPublished: function (id, doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var fields = _.clone(doc);

      delete fields._id;

      self._published.set(id, self._sharedProjectionFn(doc));

      self._multiplexer.added(id, self._projectionFn(fields)); // After adding this document, the published set might be overflowed
      // (exceeding capacity specified by limit). If so, push the maximum
      // element to the buffer, we might want to save it in memory to reduce the
      // amount of Mongo lookups in the future.


      if (self._limit && self._published.size() > self._limit) {
        // XXX in theory the size of published is no more than limit+1
        if (self._published.size() !== self._limit + 1) {
          throw new Error("After adding to published, " + (self._published.size() - self._limit) + " documents are overflowing the set");
        }

        var overflowingDocId = self._published.maxElementId();

        var overflowingDoc = self._published.get(overflowingDocId);

        if (EJSON.equals(overflowingDocId, id)) {
          throw new Error("The document just added is overflowing the published set");
        }

        self._published.remove(overflowingDocId);

        self._multiplexer.removed(overflowingDocId);

        self._addBuffered(overflowingDocId, overflowingDoc);
      }
    });
  },
  _removePublished: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._published.remove(id);

      self._multiplexer.removed(id);

      if (!self._limit || self._published.size() === self._limit) return;
      if (self._published.size() > self._limit) throw Error("self._published got too big"); // OK, we are publishing less than the limit. Maybe we should look in the
      // buffer to find the next element past what we were publishing before.

      if (!self._unpublishedBuffer.empty()) {
        // There's something in the buffer; move the first thing in it to
        // _published.
        var newDocId = self._unpublishedBuffer.minElementId();

        var newDoc = self._unpublishedBuffer.get(newDocId);

        self._removeBuffered(newDocId);

        self._addPublished(newDocId, newDoc);

        return;
      } // There's nothing in the buffer.  This could mean one of a few things.
      // (a) We could be in the middle of re-running the query (specifically, we
      // could be in _publishNewResults). In that case, _unpublishedBuffer is
      // empty because we clear it at the beginning of _publishNewResults. In
      // this case, our caller already knows the entire answer to the query and
      // we don't need to do anything fancy here.  Just return.


      if (self._phase === PHASE.QUERYING) return; // (b) We're pretty confident that the union of _published and
      // _unpublishedBuffer contain all documents that match selector. Because
      // _unpublishedBuffer is empty, that means we're confident that _published
      // contains all documents that match selector. So we have nothing to do.

      if (self._safeAppendToBuffer) return; // (c) Maybe there are other documents out there that should be in our
      // buffer. But in that case, when we emptied _unpublishedBuffer in
      // _removeBuffered, we should have called _needToPollQuery, which will
      // either put something in _unpublishedBuffer or set _safeAppendToBuffer
      // (or both), and it will put us in QUERYING for that whole time. So in
      // fact, we shouldn't be able to get here.

      throw new Error("Buffer inexplicably empty");
    });
  },
  _changePublished: function (id, oldDoc, newDoc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._published.set(id, self._sharedProjectionFn(newDoc));

      var projectedNew = self._projectionFn(newDoc);

      var projectedOld = self._projectionFn(oldDoc);

      var changed = DiffSequence.makeChangedFields(projectedNew, projectedOld);
      if (!_.isEmpty(changed)) self._multiplexer.changed(id, changed);
    });
  },
  _addBuffered: function (id, doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._unpublishedBuffer.set(id, self._sharedProjectionFn(doc)); // If something is overflowing the buffer, we just remove it from cache


      if (self._unpublishedBuffer.size() > self._limit) {
        var maxBufferedId = self._unpublishedBuffer.maxElementId();

        self._unpublishedBuffer.remove(maxBufferedId); // Since something matching is removed from cache (both published set and
        // buffer), set flag to false


        self._safeAppendToBuffer = false;
      }
    });
  },
  // Is called either to remove the doc completely from matching set or to move
  // it to the published set later.
  _removeBuffered: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._unpublishedBuffer.remove(id); // To keep the contract "buffer is never empty in STEADY phase unless the
      // everything matching fits into published" true, we poll everything as
      // soon as we see the buffer becoming empty.


      if (!self._unpublishedBuffer.size() && !self._safeAppendToBuffer) self._needToPollQuery();
    });
  },
  // Called when a document has joined the "Matching" results set.
  // Takes responsibility of keeping _unpublishedBuffer in sync with _published
  // and the effect of limit enforced.
  _addMatching: function (doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var id = doc._id;
      if (self._published.has(id)) throw Error("tried to add something already published " + id);
      if (self._limit && self._unpublishedBuffer.has(id)) throw Error("tried to add something already existed in buffer " + id);
      var limit = self._limit;
      var comparator = self._comparator;
      var maxPublished = limit && self._published.size() > 0 ? self._published.get(self._published.maxElementId()) : null;
      var maxBuffered = limit && self._unpublishedBuffer.size() > 0 ? self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()) : null; // The query is unlimited or didn't publish enough documents yet or the
      // new document would fit into published set pushing the maximum element
      // out, then we need to publish the doc.

      var toPublish = !limit || self._published.size() < limit || comparator(doc, maxPublished) < 0; // Otherwise we might need to buffer it (only in case of limited query).
      // Buffering is allowed if the buffer is not filled up yet and all
      // matching docs are either in the published set or in the buffer.

      var canAppendToBuffer = !toPublish && self._safeAppendToBuffer && self._unpublishedBuffer.size() < limit; // Or if it is small enough to be safely inserted to the middle or the
      // beginning of the buffer.

      var canInsertIntoBuffer = !toPublish && maxBuffered && comparator(doc, maxBuffered) <= 0;
      var toBuffer = canAppendToBuffer || canInsertIntoBuffer;

      if (toPublish) {
        self._addPublished(id, doc);
      } else if (toBuffer) {
        self._addBuffered(id, doc);
      } else {
        // dropping it and not saving to the cache
        self._safeAppendToBuffer = false;
      }
    });
  },
  // Called when a document leaves the "Matching" results set.
  // Takes responsibility of keeping _unpublishedBuffer in sync with _published
  // and the effect of limit enforced.
  _removeMatching: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (!self._published.has(id) && !self._limit) throw Error("tried to remove something matching but not cached " + id);

      if (self._published.has(id)) {
        self._removePublished(id);
      } else if (self._unpublishedBuffer.has(id)) {
        self._removeBuffered(id);
      }
    });
  },
  _handleDoc: function (id, newDoc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var matchesNow = newDoc && self._matcher.documentMatches(newDoc).result;

      var publishedBefore = self._published.has(id);

      var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);

      var cachedBefore = publishedBefore || bufferedBefore;

      if (matchesNow && !cachedBefore) {
        self._addMatching(newDoc);
      } else if (cachedBefore && !matchesNow) {
        self._removeMatching(id);
      } else if (cachedBefore && matchesNow) {
        var oldDoc = self._published.get(id);

        var comparator = self._comparator;

        var minBuffered = self._limit && self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.minElementId());

        var maxBuffered;

        if (publishedBefore) {
          // Unlimited case where the document stays in published once it
          // matches or the case when we don't have enough matching docs to
          // publish or the changed but matching doc will stay in published
          // anyways.
          //
          // XXX: We rely on the emptiness of buffer. Be sure to maintain the
          // fact that buffer can't be empty if there are matching documents not
          // published. Notably, we don't want to schedule repoll and continue
          // relying on this property.
          var staysInPublished = !self._limit || self._unpublishedBuffer.size() === 0 || comparator(newDoc, minBuffered) <= 0;

          if (staysInPublished) {
            self._changePublished(id, oldDoc, newDoc);
          } else {
            // after the change doc doesn't stay in the published, remove it
            self._removePublished(id); // but it can move into buffered now, check it


            maxBuffered = self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId());
            var toBuffer = self._safeAppendToBuffer || maxBuffered && comparator(newDoc, maxBuffered) <= 0;

            if (toBuffer) {
              self._addBuffered(id, newDoc);
            } else {
              // Throw away from both published set and buffer
              self._safeAppendToBuffer = false;
            }
          }
        } else if (bufferedBefore) {
          oldDoc = self._unpublishedBuffer.get(id); // remove the old version manually instead of using _removeBuffered so
          // we don't trigger the querying immediately.  if we end this block
          // with the buffer empty, we will need to trigger the query poll
          // manually too.

          self._unpublishedBuffer.remove(id);

          var maxPublished = self._published.get(self._published.maxElementId());

          maxBuffered = self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()); // the buffered doc was updated, it could move to published

          var toPublish = comparator(newDoc, maxPublished) < 0; // or stays in buffer even after the change

          var staysInBuffer = !toPublish && self._safeAppendToBuffer || !toPublish && maxBuffered && comparator(newDoc, maxBuffered) <= 0;

          if (toPublish) {
            self._addPublished(id, newDoc);
          } else if (staysInBuffer) {
            // stays in buffer but changes
            self._unpublishedBuffer.set(id, newDoc);
          } else {
            // Throw away from both published set and buffer
            self._safeAppendToBuffer = false; // Normally this check would have been done in _removeBuffered but
            // we didn't use it, so we need to do it ourself now.

            if (!self._unpublishedBuffer.size()) {
              self._needToPollQuery();
            }
          }
        } else {
          throw new Error("cachedBefore implies either of publishedBefore or bufferedBefore is true.");
        }
      }
    });
  },
  _fetchModifiedDocuments: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._registerPhaseChange(PHASE.FETCHING); // Defer, because nothing called from the oplog entry handler may yield,
      // but fetch() yields.


      Meteor.defer(finishIfNeedToPollQuery(function () {
        while (!self._stopped && !self._needToFetch.empty()) {
          if (self._phase === PHASE.QUERYING) {
            // While fetching, we decided to go into QUERYING mode, and then we
            // saw another oplog entry, so _needToFetch is not empty. But we
            // shouldn't fetch these documents until AFTER the query is done.
            break;
          } // Being in steady phase here would be surprising.


          if (self._phase !== PHASE.FETCHING) throw new Error("phase in fetchModifiedDocuments: " + self._phase);
          self._currentlyFetching = self._needToFetch;
          var thisGeneration = ++self._fetchGeneration;
          self._needToFetch = new LocalCollection._IdMap();
          var waiting = 0;
          var fut = new Future(); // This loop is safe, because _currentlyFetching will not be updated
          // during this loop (in fact, it is never mutated).

          self._currentlyFetching.forEach(function (cacheKey, id) {
            waiting++;

            self._mongoHandle._docFetcher.fetch(self._cursorDescription.collectionName, id, cacheKey, finishIfNeedToPollQuery(function (err, doc) {
              try {
                if (err) {
                  Meteor._debug("Got exception while fetching documents: " + err); // If we get an error from the fetcher (eg, trouble
                  // connecting to Mongo), let's just abandon the fetch phase
                  // altogether and fall back to polling. It's not like we're
                  // getting live updates anyway.


                  if (self._phase !== PHASE.QUERYING) {
                    self._needToPollQuery();
                  }
                } else if (!self._stopped && self._phase === PHASE.FETCHING && self._fetchGeneration === thisGeneration) {
                  // We re-check the generation in case we've had an explicit
                  // _pollQuery call (eg, in another fiber) which should
                  // effectively cancel this round of fetches.  (_pollQuery
                  // increments the generation.)
                  self._handleDoc(id, doc);
                }
              } finally {
                waiting--; // Because fetch() never calls its callback synchronously,
                // this is safe (ie, we won't call fut.return() before the
                // forEach is done).

                if (waiting === 0) fut.return();
              }
            }));
          });

          fut.wait(); // Exit now if we've had a _pollQuery call (here or in another fiber).

          if (self._phase === PHASE.QUERYING) return;
          self._currentlyFetching = null;
        } // We're done fetching, so we can be steady, unless we've had a
        // _pollQuery call (here or in another fiber).


        if (self._phase !== PHASE.QUERYING) self._beSteady();
      }));
    });
  },
  _beSteady: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._registerPhaseChange(PHASE.STEADY);

      var writes = self._writesToCommitWhenWeReachSteady;
      self._writesToCommitWhenWeReachSteady = [];

      self._multiplexer.onFlush(function () {
        _.each(writes, function (w) {
          w.committed();
        });
      });
    });
  },
  _handleOplogEntryQuerying: function (op) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._needToFetch.set(idForOp(op), op.ts.toString());
    });
  },
  _handleOplogEntrySteadyOrFetching: function (op) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var id = idForOp(op); // If we're already fetching this one, or about to, we can't optimize;
      // make sure that we fetch it again if necessary.

      if (self._phase === PHASE.FETCHING && (self._currentlyFetching && self._currentlyFetching.has(id) || self._needToFetch.has(id))) {
        self._needToFetch.set(id, op.ts.toString());

        return;
      }

      if (op.op === 'd') {
        if (self._published.has(id) || self._limit && self._unpublishedBuffer.has(id)) self._removeMatching(id);
      } else if (op.op === 'i') {
        if (self._published.has(id)) throw new Error("insert found for already-existing ID in published");
        if (self._unpublishedBuffer && self._unpublishedBuffer.has(id)) throw new Error("insert found for already-existing ID in buffer"); // XXX what if selector yields?  for now it can't but later it could
        // have $where

        if (self._matcher.documentMatches(op.o).result) self._addMatching(op.o);
      } else if (op.op === 'u') {
        // Is this a modifier ($set/$unset, which may require us to poll the
        // database to figure out if the whole document matches the selector) or
        // a replacement (in which case we can just directly re-evaluate the
        // selector)?
        var isReplace = !_.has(op.o, '$set') && !_.has(op.o, '$unset'); // If this modifier modifies something inside an EJSON custom type (ie,
        // anything with EJSON$), then we can't try to use
        // LocalCollection._modify, since that just mutates the EJSON encoding,
        // not the actual object.

        var canDirectlyModifyDoc = !isReplace && modifierCanBeDirectlyApplied(op.o);

        var publishedBefore = self._published.has(id);

        var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);

        if (isReplace) {
          self._handleDoc(id, _.extend({
            _id: id
          }, op.o));
        } else if ((publishedBefore || bufferedBefore) && canDirectlyModifyDoc) {
          // Oh great, we actually know what the document is, so we can apply
          // this directly.
          var newDoc = self._published.has(id) ? self._published.get(id) : self._unpublishedBuffer.get(id);
          newDoc = EJSON.clone(newDoc);
          newDoc._id = id;

          try {
            LocalCollection._modify(newDoc, op.o);
          } catch (e) {
            if (e.name !== "MinimongoError") throw e; // We didn't understand the modifier.  Re-fetch.

            self._needToFetch.set(id, op.ts.toString());

            if (self._phase === PHASE.STEADY) {
              self._fetchModifiedDocuments();
            }

            return;
          }

          self._handleDoc(id, self._sharedProjectionFn(newDoc));
        } else if (!canDirectlyModifyDoc || self._matcher.canBecomeTrueByModifier(op.o) || self._sorter && self._sorter.affectedByModifier(op.o)) {
          self._needToFetch.set(id, op.ts.toString());

          if (self._phase === PHASE.STEADY) self._fetchModifiedDocuments();
        }
      } else {
        throw Error("XXX SURPRISING OPERATION: " + op);
      }
    });
  },
  // Yields!
  _runInitialQuery: function () {
    var self = this;
    if (self._stopped) throw new Error("oplog stopped surprisingly early");

    self._runQuery({
      initial: true
    }); // yields


    if (self._stopped) return; // can happen on queryError
    // Allow observeChanges calls to return. (After this, it's possible for
    // stop() to be called.)

    self._multiplexer.ready();

    self._doneQuerying(); // yields

  },
  // In various circumstances, we may just want to stop processing the oplog and
  // re-run the initial query, just as if we were a PollingObserveDriver.
  //
  // This function may not block, because it is called from an oplog entry
  // handler.
  //
  // XXX We should call this when we detect that we've been in FETCHING for "too
  // long".
  //
  // XXX We should call this when we detect Mongo failover (since that might
  // mean that some of the oplog entries we have processed have been rolled
  // back). The Node Mongo driver is in the middle of a bunch of huge
  // refactorings, including the way that it notifies you when primary
  // changes. Will put off implementing this until driver 1.4 is out.
  _pollQuery: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (self._stopped) return; // Yay, we get to forget about all the things we thought we had to fetch.

      self._needToFetch = new LocalCollection._IdMap();
      self._currentlyFetching = null;
      ++self._fetchGeneration; // ignore any in-flight fetches

      self._registerPhaseChange(PHASE.QUERYING); // Defer so that we don't yield.  We don't need finishIfNeedToPollQuery
      // here because SwitchedToQuery is not thrown in QUERYING mode.


      Meteor.defer(function () {
        self._runQuery();

        self._doneQuerying();
      });
    });
  },
  // Yields!
  _runQuery: function (options) {
    var self = this;
    options = options || {};
    var newResults, newBuffer; // This while loop is just to retry failures.

    while (true) {
      // If we've been stopped, we don't have to run anything any more.
      if (self._stopped) return;
      newResults = new LocalCollection._IdMap();
      newBuffer = new LocalCollection._IdMap(); // Query 2x documents as the half excluded from the original query will go
      // into unpublished buffer to reduce additional Mongo lookups in cases
      // when documents are removed from the published set and need a
      // replacement.
      // XXX needs more thought on non-zero skip
      // XXX 2 is a "magic number" meaning there is an extra chunk of docs for
      // buffer if such is needed.

      var cursor = self._cursorForQuery({
        limit: self._limit * 2
      });

      try {
        cursor.forEach(function (doc, i) {
          // yields
          if (!self._limit || i < self._limit) {
            newResults.set(doc._id, doc);
          } else {
            newBuffer.set(doc._id, doc);
          }
        });
        break;
      } catch (e) {
        if (options.initial && typeof e.code === 'number') {
          // This is an error document sent to us by mongod, not a connection
          // error generated by the client. And we've never seen this query work
          // successfully. Probably it's a bad selector or something, so we
          // should NOT retry. Instead, we should halt the observe (which ends
          // up calling `stop` on us).
          self._multiplexer.queryError(e);

          return;
        } // During failover (eg) if we get an exception we should log and retry
        // instead of crashing.


        Meteor._debug("Got exception while polling query: " + e);

        Meteor._sleepForMs(100);
      }
    }

    if (self._stopped) return;

    self._publishNewResults(newResults, newBuffer);
  },
  // Transitions to QUERYING and runs another query, or (if already in QUERYING)
  // ensures that we will query again later.
  //
  // This function may not block, because it is called from an oplog entry
  // handler. However, if we were not already in the QUERYING phase, it throws
  // an exception that is caught by the closest surrounding
  // finishIfNeedToPollQuery call; this ensures that we don't continue running
  // close that was designed for another phase inside PHASE.QUERYING.
  //
  // (It's also necessary whenever logic in this file yields to check that other
  // phases haven't put us into QUERYING mode, though; eg,
  // _fetchModifiedDocuments does this.)
  _needToPollQuery: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (self._stopped) return; // If we're not already in the middle of a query, we can query now
      // (possibly pausing FETCHING).

      if (self._phase !== PHASE.QUERYING) {
        self._pollQuery();

        throw new SwitchedToQuery();
      } // We're currently in QUERYING. Set a flag to ensure that we run another
      // query when we're done.


      self._requeryWhenDoneThisQuery = true;
    });
  },
  // Yields!
  _doneQuerying: function () {
    var self = this;
    if (self._stopped) return;

    self._mongoHandle._oplogHandle.waitUntilCaughtUp(); // yields


    if (self._stopped) return;
    if (self._phase !== PHASE.QUERYING) throw Error("Phase unexpectedly " + self._phase);

    Meteor._noYieldsAllowed(function () {
      if (self._requeryWhenDoneThisQuery) {
        self._requeryWhenDoneThisQuery = false;

        self._pollQuery();
      } else if (self._needToFetch.empty()) {
        self._beSteady();
      } else {
        self._fetchModifiedDocuments();
      }
    });
  },
  _cursorForQuery: function (optionsOverwrite) {
    var self = this;
    return Meteor._noYieldsAllowed(function () {
      // The query we run is almost the same as the cursor we are observing,
      // with a few changes. We need to read all the fields that are relevant to
      // the selector, not just the fields we are going to publish (that's the
      // "shared" projection). And we don't want to apply any transform in the
      // cursor, because observeChanges shouldn't use the transform.
      var options = _.clone(self._cursorDescription.options); // Allow the caller to modify the options. Useful to specify different
      // skip and limit values.


      _.extend(options, optionsOverwrite);

      options.fields = self._sharedProjection;
      delete options.transform; // We are NOT deep cloning fields or selector here, which should be OK.

      var description = new CursorDescription(self._cursorDescription.collectionName, self._cursorDescription.selector, options);
      return new Cursor(self._mongoHandle, description);
    });
  },
  // Replace self._published with newResults (both are IdMaps), invoking observe
  // callbacks on the multiplexer.
  // Replace self._unpublishedBuffer with newBuffer.
  //
  // XXX This is very similar to LocalCollection._diffQueryUnorderedChanges. We
  // should really: (a) Unify IdMap and OrderedDict into Unordered/OrderedDict
  // (b) Rewrite diff.js to use these classes instead of arrays and objects.
  _publishNewResults: function (newResults, newBuffer) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      // If the query is limited and there is a buffer, shut down so it doesn't
      // stay in a way.
      if (self._limit) {
        self._unpublishedBuffer.clear();
      } // First remove anything that's gone. Be careful not to modify
      // self._published while iterating over it.


      var idsToRemove = [];

      self._published.forEach(function (doc, id) {
        if (!newResults.has(id)) idsToRemove.push(id);
      });

      _.each(idsToRemove, function (id) {
        self._removePublished(id);
      }); // Now do adds and changes.
      // If self has a buffer and limit, the new fetched result will be
      // limited correctly as the query has sort specifier.


      newResults.forEach(function (doc, id) {
        self._handleDoc(id, doc);
      }); // Sanity-check that everything we tried to put into _published ended up
      // there.
      // XXX if this is slow, remove it later

      if (self._published.size() !== newResults.size()) {
        throw Error("The Mongo server and the Meteor query disagree on how " + "many documents match your query. Maybe it is hitting a Mongo " + "edge case? The query is: " + EJSON.stringify(self._cursorDescription.selector));
      }

      self._published.forEach(function (doc, id) {
        if (!newResults.has(id)) throw Error("_published has a doc that newResults doesn't; " + id);
      }); // Finally, replace the buffer


      newBuffer.forEach(function (doc, id) {
        self._addBuffered(id, doc);
      });
      self._safeAppendToBuffer = newBuffer.size() < self._limit;
    });
  },
  // This stop function is invoked from the onStop of the ObserveMultiplexer, so
  // it shouldn't actually be possible to call it until the multiplexer is
  // ready.
  //
  // It's important to check self._stopped after every call in this file that
  // can yield!
  stop: function () {
    var self = this;
    if (self._stopped) return;
    self._stopped = true;

    _.each(self._stopHandles, function (handle) {
      handle.stop();
    }); // Note: we *don't* use multiplexer.onFlush here because this stop
    // callback is actually invoked by the multiplexer itself when it has
    // determined that there are no handles left. So nothing is actually going
    // to get flushed (and it's probably not valid to call methods on the
    // dying multiplexer).


    _.each(self._writesToCommitWhenWeReachSteady, function (w) {
      w.committed(); // maybe yields?
    });

    self._writesToCommitWhenWeReachSteady = null; // Proactively drop references to potentially big things.

    self._published = null;
    self._unpublishedBuffer = null;
    self._needToFetch = null;
    self._currentlyFetching = null;
    self._oplogEntryHandle = null;
    self._listenersHandle = null;
    Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", -1);
  },
  _registerPhaseChange: function (phase) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var now = new Date();

      if (self._phase) {
        var timeDiff = now - self._phaseStartTime;
        Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "time-spent-in-" + self._phase + "-phase", timeDiff);
      }

      self._phase = phase;
      self._phaseStartTime = now;
    });
  }
}); // Does our oplog tailing code support this cursor? For now, we are being very
// conservative and allowing only simple queries with simple options.
// (This is a "static method".)


OplogObserveDriver.cursorSupported = function (cursorDescription, matcher) {
  // First, check the options.
  var options = cursorDescription.options; // Did the user say no explicitly?
  // underscored version of the option is COMPAT with 1.2

  if (options.disableOplog || options._disableOplog) return false; // skip is not supported: to support it we would need to keep track of all
  // "skipped" documents or at least their ids.
  // limit w/o a sort specifier is not supported: current implementation needs a
  // deterministic way to order documents.

  if (options.skip || options.limit && !options.sort) return false; // If a fields projection option is given check if it is supported by
  // minimongo (some operators are not supported).

  if (options.fields) {
    try {
      LocalCollection._checkSupportedProjection(options.fields);
    } catch (e) {
      if (e.name === "MinimongoError") {
        return false;
      } else {
        throw e;
      }
    }
  } // We don't allow the following selectors:
  //   - $where (not confident that we provide the same JS environment
  //             as Mongo, and can yield!)
  //   - $near (has "interesting" properties in MongoDB, like the possibility
  //            of returning an ID multiple times, though even polling maybe
  //            have a bug there)
  //           XXX: once we support it, we would need to think more on how we
  //           initialize the comparators when we create the driver.


  return !matcher.hasWhere() && !matcher.hasGeoQuery();
};

var modifierCanBeDirectlyApplied = function (modifier) {
  return _.all(modifier, function (fields, operation) {
    return _.all(fields, function (value, field) {
      return !/EJSON\$/.test(field);
    });
  });
};

MongoInternals.OplogObserveDriver = OplogObserveDriver;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection_driver.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/local_collection_driver.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
LocalCollectionDriver = function () {
  var self = this;
  self.noConnCollections = {};
};

var ensureCollection = function (name, collections) {
  if (!(name in collections)) collections[name] = new LocalCollection(name);
  return collections[name];
};

_.extend(LocalCollectionDriver.prototype, {
  open: function (name, conn) {
    var self = this;
    if (!name) return new LocalCollection();

    if (!conn) {
      return ensureCollection(name, self.noConnCollections);
    }

    if (!conn._mongo_livedata_collections) conn._mongo_livedata_collections = {}; // XXX is there a way to keep track of a connection's collections without
    // dangling it off the connection object?

    return ensureCollection(name, conn._mongo_livedata_collections);
  }
}); // singleton


LocalCollectionDriver = new LocalCollectionDriver();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"remote_collection_driver.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/remote_collection_driver.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
MongoInternals.RemoteCollectionDriver = function (mongo_url, options) {
  var self = this;
  self.mongo = new MongoConnection(mongo_url, options);
};

_.extend(MongoInternals.RemoteCollectionDriver.prototype, {
  open: function (name) {
    var self = this;
    var ret = {};

    _.each(['find', 'findOne', 'insert', 'update', 'upsert', 'remove', '_ensureIndex', '_dropIndex', '_createCappedCollection', 'dropCollection', 'rawCollection'], function (m) {
      ret[m] = _.bind(self.mongo[m], self.mongo, name);
    });

    return ret;
  }
}); // Create the singleton RemoteCollectionDriver only on demand, so we
// only require Mongo configuration if it's actually used (eg, not if
// you're only trying to receive data from a remote DDP server.)


MongoInternals.defaultRemoteCollectionDriver = _.once(function () {
  var connectionOptions = {};
  var mongoUrl = process.env.MONGO_URL;

  if (process.env.MONGO_OPLOG_URL) {
    connectionOptions.oplogUrl = process.env.MONGO_OPLOG_URL;
  }

  if (!mongoUrl) throw new Error("MONGO_URL must be set in environment");
  return new MongoInternals.RemoteCollectionDriver(mongoUrl, connectionOptions);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"collection.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// options.connection, if given, is a LivedataClient or LivedataServer
// XXX presently there is no way to destroy/clean up a Collection
/**
 * @summary Namespace for MongoDB-related items
 * @namespace
 */Mongo = {}; /**
                * @summary Constructor for a Collection
                * @locus Anywhere
                * @instancename collection
                * @class
                * @param {String} name The name of the collection.  If null, creates an unmanaged (unsynchronized) local collection.
                * @param {Object} [options]
                * @param {Object} options.connection The server connection that will manage this collection. Uses the default connection if not specified.  Pass the return value of calling [`DDP.connect`](#ddp_connect) to specify a different server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
                * @param {String} options.idGeneration The method of generating the `_id` fields of new documents in this collection.  Possible values:
               
                - **`'STRING'`**: random strings
                - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values
               
               The default id generation technique is `'STRING'`.
                * @param {Function} options.transform An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOne`, and before being passed to callbacks of `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
                * @param {Boolean} options.defineMutationMethods Set to `false` to skip setting up the mutation methods that enable insert/update/remove from client code. Default `true`.
                */

Mongo.Collection = function (name, options) {
  var self = this;
  if (!(self instanceof Mongo.Collection)) throw new Error('use "new" to construct a Mongo.Collection');

  if (!name && name !== null) {
    Meteor._debug("Warning: creating anonymous collection. It will not be " + "saved or synchronized over the network. (Pass null for " + "the collection name to turn off this warning.)");

    name = null;
  }

  if (name !== null && typeof name !== "string") {
    throw new Error("First argument to new Mongo.Collection must be a string or null");
  }

  if (options && options.methods) {
    // Backwards compatibility hack with original signature (which passed
    // "connection" directly instead of in options. (Connections must have a "methods"
    // method.)
    // XXX remove before 1.0
    options = {
      connection: options
    };
  } // Backwards compatibility: "connection" used to be called "manager".


  if (options && options.manager && !options.connection) {
    options.connection = options.manager;
  }

  options = _.extend({
    connection: undefined,
    idGeneration: 'STRING',
    transform: null,
    _driver: undefined,
    _preventAutopublish: false
  }, options);

  switch (options.idGeneration) {
    case 'MONGO':
      self._makeNewID = function () {
        var src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
        return new Mongo.ObjectID(src.hexString(24));
      };

      break;

    case 'STRING':
    default:
      self._makeNewID = function () {
        var src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
        return src.id();
      };

      break;
  }

  self._transform = LocalCollection.wrapTransform(options.transform);
  if (!name || options.connection === null) // note: nameless collections never have a connection
    self._connection = null;else if (options.connection) self._connection = options.connection;else if (Meteor.isClient) self._connection = Meteor.connection;else self._connection = Meteor.server;

  if (!options._driver) {
    // XXX This check assumes that webapp is loaded so that Meteor.server !==
    // null. We should fully support the case of "want to use a Mongo-backed
    // collection from Node code without webapp", but we don't yet.
    // #MeteorServerNull
    if (name && self._connection === Meteor.server && typeof MongoInternals !== "undefined" && MongoInternals.defaultRemoteCollectionDriver) {
      options._driver = MongoInternals.defaultRemoteCollectionDriver();
    } else {
      options._driver = LocalCollectionDriver;
    }
  }

  self._collection = options._driver.open(name, self._connection);
  self._name = name;
  self._driver = options._driver;

  if (self._connection && self._connection.registerStore) {
    // OK, we're going to be a slave, replicating some remote
    // database, except possibly with some temporary divergence while
    // we have unacknowledged RPC's.
    var ok = self._connection.registerStore(name, {
      // Called at the beginning of a batch of updates. batchSize is the number
      // of update calls to expect.
      //
      // XXX This interface is pretty janky. reset probably ought to go back to
      // being its own function, and callers shouldn't have to calculate
      // batchSize. The optimization of not calling pause/remove should be
      // delayed until later: the first call to update() should buffer its
      // message, and then we can either directly apply it at endUpdate time if
      // it was the only update, or do pauseObservers/apply/apply at the next
      // update() if there's another one.
      beginUpdate: function (batchSize, reset) {
        // pause observers so users don't see flicker when updating several
        // objects at once (including the post-reconnect reset-and-reapply
        // stage), and so that a re-sorting of a query can take advantage of the
        // full _diffQuery moved calculation instead of applying change one at a
        // time.
        if (batchSize > 1 || reset) self._collection.pauseObservers();
        if (reset) self._collection.remove({});
      },
      // Apply an update.
      // XXX better specify this interface (not in terms of a wire message)?
      update: function (msg) {
        var mongoId = MongoID.idParse(msg.id);

        var doc = self._collection.findOne(mongoId); // Is this a "replace the whole doc" message coming from the quiescence
        // of method writes to an object? (Note that 'undefined' is a valid
        // value meaning "remove it".)


        if (msg.msg === 'replace') {
          var replace = msg.replace;

          if (!replace) {
            if (doc) self._collection.remove(mongoId);
          } else if (!doc) {
            self._collection.insert(replace);
          } else {
            // XXX check that replace has no $ ops
            self._collection.update(mongoId, replace);
          }

          return;
        } else if (msg.msg === 'added') {
          if (doc) {
            throw new Error("Expected not to find a document already present for an add");
          }

          self._collection.insert(_.extend({
            _id: mongoId
          }, msg.fields));
        } else if (msg.msg === 'removed') {
          if (!doc) throw new Error("Expected to find a document already present for removed");

          self._collection.remove(mongoId);
        } else if (msg.msg === 'changed') {
          if (!doc) throw new Error("Expected to find a document to change");

          if (!_.isEmpty(msg.fields)) {
            var modifier = {};

            _.each(msg.fields, function (value, key) {
              if (value === undefined) {
                if (!modifier.$unset) modifier.$unset = {};
                modifier.$unset[key] = 1;
              } else {
                if (!modifier.$set) modifier.$set = {};
                modifier.$set[key] = value;
              }
            });

            self._collection.update(mongoId, modifier);
          }
        } else {
          throw new Error("I don't know how to deal with this message");
        }
      },
      // Called at the end of a batch of updates.
      endUpdate: function () {
        self._collection.resumeObservers();
      },
      // Called around method stub invocations to capture the original versions
      // of modified documents.
      saveOriginals: function () {
        self._collection.saveOriginals();
      },
      retrieveOriginals: function () {
        return self._collection.retrieveOriginals();
      },
      // Used to preserve current versions of documents across a store reset.
      getDoc: function (id) {
        return self.findOne(id);
      },
      // To be able to get back to the collection from the store.
      _getCollection: function () {
        return self;
      }
    });

    if (!ok) {
      const message = `There is already a collection named "${name}"`;

      if (options._suppressSameNameError === true) {
        // XXX In theory we do not have to throw when `ok` is falsy. The store is already defined
        // for this collection name, but this will simply be another reference to it and everything
        // should work. However, we have historically thrown an error here, so for now we will
        // skip the error only when `_suppressSameNameError` is `true`, allowing people to opt in
        // and give this some real world testing.
        console.warn ? console.warn(message) : console.log(message);
      } else {
        throw new Error(message);
      }
    }
  } // XXX don't define these until allow or deny is actually used for this
  // collection. Could be hard if the security rules are only defined on the
  // server.


  if (options.defineMutationMethods !== false) {
    try {
      self._defineMutationMethods({
        useExisting: options._suppressSameNameError === true
      });
    } catch (error) {
      // Throw a more understandable error on the server for same collection name
      if (error.message === `A method named '/${name}/insert' is already defined`) throw new Error(`There is already a collection named "${name}"`);
      throw error;
    }
  } // autopublish


  if (Package.autopublish && !options._preventAutopublish && self._connection && self._connection.publish) {
    self._connection.publish(null, function () {
      return self.find();
    }, {
      is_auto: true
    });
  }
}; ///
/// Main collection API
///


_.extend(Mongo.Collection.prototype, {
  _getFindSelector: function (args) {
    if (args.length == 0) return {};else return args[0];
  },
  _getFindOptions: function (args) {
    var self = this;

    if (args.length < 2) {
      return {
        transform: self._transform
      };
    } else {
      check(args[1], Match.Optional(Match.ObjectIncluding({
        fields: Match.Optional(Match.OneOf(Object, undefined)),
        sort: Match.Optional(Match.OneOf(Object, Array, Function, undefined)),
        limit: Match.Optional(Match.OneOf(Number, undefined)),
        skip: Match.Optional(Match.OneOf(Number, undefined))
      })));
      return _.extend({
        transform: self._transform
      }, args[1]);
    }
  },
  /**
   * @summary Find the documents in a collection that match the selector.
   * @locus Anywhere
   * @method find
   * @memberOf Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {Number} options.limit Maximum number of results to return
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default `true`; pass `false` to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @param {Boolean} options.disableOplog (Server only) Pass true to disable oplog-tailing on this query. This affects the way server processes calls to `observe` on this query. Disabling the oplog can be useful when working with data that updates in large batches.
   * @param {Number} options.pollingIntervalMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the frequency (in milliseconds) of how often to poll this query when observing on the server. Defaults to 10000ms (10 seconds).
   * @param {Number} options.pollingThrottleMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the minimum time (in milliseconds) to allow between re-polling when observing on the server. Increasing this will save CPU and mongo load at the expense of slower updates to users. Decreasing this is not recommended. Defaults to 50ms.
   * @param {Number} options.maxTimeMs (Server only) If set, instructs MongoDB to set a time limit for this cursor's operations. If the operation reaches the specified time limit (in milliseconds) without the having been completed, an exception will be thrown. Useful to prevent an (accidental or malicious) unoptimized query from causing a full collection scan that would disrupt other database users, at the expense of needing to handle the resulting error.
   * @param {String|Object} options.hint (Server only) Overrides MongoDB's default index selection and query optimization process. Specify an index to force its use, either by its name or index specification. You can also specify `{ $natural : 1 }` to force a forwards collection scan, or `{ $natural : -1 }` for a reverse collection scan. Setting this is only recommended for advanced users.
   * @returns {Mongo.Cursor}
   */find: function () /* selector, options */{
    // Collection.find() (return all docs) behaves differently
    // from Collection.find(undefined) (return 0 docs).  so be
    // careful about the length of arguments.
    var self = this;

    var argArray = _.toArray(arguments);

    return self._collection.find(self._getFindSelector(argArray), self._getFindOptions(argArray));
  },
  /**
   * @summary Finds the first document that matches the selector, as ordered by sort and skip options. Returns `undefined` if no matching document is found.
   * @locus Anywhere
   * @method findOne
   * @memberOf Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default true; pass false to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @returns {Object}
   */findOne: function () /* selector, options */{
    var self = this;

    var argArray = _.toArray(arguments);

    return self._collection.findOne(self._getFindSelector(argArray), self._getFindOptions(argArray));
  }
});

Mongo.Collection._publishCursor = function (cursor, sub, collection) {
  var observeHandle = cursor.observeChanges({
    added: function (id, fields) {
      sub.added(collection, id, fields);
    },
    changed: function (id, fields) {
      sub.changed(collection, id, fields);
    },
    removed: function (id) {
      sub.removed(collection, id);
    }
  }); // We don't call sub.ready() here: it gets called in livedata_server, after
  // possibly calling _publishCursor on multiple returned cursors.
  // register stop callback (expects lambda w/ no args).

  sub.onStop(function () {
    observeHandle.stop();
  }); // return the observeHandle in case it needs to be stopped early

  return observeHandle;
}; // protect against dangerous selectors.  falsey and {_id: falsey} are both
// likely programmer error, and not what you want, particularly for destructive
// operations. If a falsey _id is sent in, a new string _id will be
// generated and returned; if a fallbackId is provided, it will be returned
// instead.


Mongo.Collection._rewriteSelector = (selector, {
  fallbackId
} = {}) => {
  // shorthand -- scalars match _id
  if (LocalCollection._selectorIsId(selector)) selector = {
    _id: selector
  };

  if (_.isArray(selector)) {
    // This is consistent with the Mongo console itself; if we don't do this
    // check passing an empty array ends up selecting all items
    throw new Error("Mongo selector can't be an array.");
  }

  if (!selector || '_id' in selector && !selector._id) {
    // can't match anything
    return {
      _id: fallbackId || Random.id()
    };
  }

  return selector;
}; // 'insert' immediately returns the inserted document's new _id.
// The others return values immediately if you are in a stub, an in-memory
// unmanaged collection, or a mongo-backed collection and you don't pass a
// callback. 'update' and 'remove' return the number of affected
// documents. 'upsert' returns an object with keys 'numberAffected' and, if an
// insert happened, 'insertedId'.
//
// Otherwise, the semantics are exactly like other methods: they take
// a callback as an optional last argument; if no callback is
// provided, they block until the operation is complete, and throw an
// exception if it fails; if a callback is provided, then they don't
// necessarily block, and they call the callback when they finish with error and
// result arguments.  (The insert method provides the document ID as its result;
// update and remove provide the number of affected docs as the result; upsert
// provides an object with numberAffected and maybe insertedId.)
//
// On the client, blocking is impossible, so if a callback
// isn't provided, they just return immediately and any error
// information is lost.
//
// There's one more tweak. On the client, if you don't provide a
// callback, then if there is an error, a message will be logged with
// Meteor._debug.
//
// The intent (though this is actually determined by the underlying
// drivers) is that the operations should be done synchronously, not
// generating their result until the database has acknowledged
// them. In the future maybe we should provide a flag to turn this
// off.
/**
 * @summary Insert a document in the collection.  Returns its unique _id.
 * @locus Anywhere
 * @method  insert
 * @memberOf Mongo.Collection
 * @instance
 * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
 * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the _id as the second.
 */

Mongo.Collection.prototype.insert = function insert(doc, callback) {
  // Make sure we were passed a document to insert
  if (!doc) {
    throw new Error("insert requires an argument");
  } // Make a shallow clone of the document, preserving its prototype.


  doc = Object.create(Object.getPrototypeOf(doc), Object.getOwnPropertyDescriptors(doc));

  if ('_id' in doc) {
    if (!doc._id || !(typeof doc._id === 'string' || doc._id instanceof Mongo.ObjectID)) {
      throw new Error("Meteor requires document _id fields to be non-empty strings or ObjectIDs");
    }
  } else {
    let generateId = true; // Don't generate the id if we're the client and the 'outermost' call
    // This optimization saves us passing both the randomSeed and the id
    // Passing both is redundant.

    if (this._isRemoteCollection()) {
      const enclosing = DDP._CurrentMethodInvocation.get();

      if (!enclosing) {
        generateId = false;
      }
    }

    if (generateId) {
      doc._id = this._makeNewID();
    }
  } // On inserts, always return the id that we generated; on all other
  // operations, just return the result from the collection.


  var chooseReturnValueFromCollectionResult = function (result) {
    if (doc._id) {
      return doc._id;
    } // XXX what is this for??
    // It's some iteraction between the callback to _callMutatorMethod and
    // the return value conversion


    doc._id = result;
    return result;
  };

  const wrappedCallback = wrapCallback(callback, chooseReturnValueFromCollectionResult);

  if (this._isRemoteCollection()) {
    const result = this._callMutatorMethod("insert", [doc], wrappedCallback);

    return chooseReturnValueFromCollectionResult(result);
  } // it's my collection.  descend into the collection object
  // and propagate any exception.


  try {
    // If the user provided a callback and the collection implements this
    // operation asynchronously, then queryRet will be undefined, and the
    // result will be returned through the callback instead.
    const result = this._collection.insert(doc, wrappedCallback);

    return chooseReturnValueFromCollectionResult(result);
  } catch (e) {
    if (callback) {
      callback(e);
      return null;
    }

    throw e;
  }
}; /**
    * @summary Modify one or more documents in the collection. Returns the number of matched documents.
    * @locus Anywhere
    * @method update
    * @memberOf Mongo.Collection
    * @instance
    * @param {MongoSelector} selector Specifies which documents to modify
    * @param {MongoModifier} modifier Specifies how to modify the documents
    * @param {Object} [options]
    * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
    * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
    * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
    */

Mongo.Collection.prototype.update = function update(selector, modifier, ...optionsAndCallback) {
  const callback = popCallbackFromArgs(optionsAndCallback); // We've already popped off the callback, so we are left with an array
  // of one or zero items

  const options = _.clone(optionsAndCallback[0]) || {};
  let insertedId;

  if (options && options.upsert) {
    // set `insertedId` if absent.  `insertedId` is a Meteor extension.
    if (options.insertedId) {
      if (!(typeof options.insertedId === 'string' || options.insertedId instanceof Mongo.ObjectID)) throw new Error("insertedId must be string or ObjectID");
      insertedId = options.insertedId;
    } else if (!selector || !selector._id) {
      insertedId = this._makeNewID();
      options.generatedId = true;
      options.insertedId = insertedId;
    }
  }

  selector = Mongo.Collection._rewriteSelector(selector, {
    fallbackId: insertedId
  });
  const wrappedCallback = wrapCallback(callback);

  if (this._isRemoteCollection()) {
    const args = [selector, modifier, options];
    return this._callMutatorMethod("update", args, wrappedCallback);
  } // it's my collection.  descend into the collection object
  // and propagate any exception.


  try {
    // If the user provided a callback and the collection implements this
    // operation asynchronously, then queryRet will be undefined, and the
    // result will be returned through the callback instead.
    return this._collection.update(selector, modifier, options, wrappedCallback);
  } catch (e) {
    if (callback) {
      callback(e);
      return null;
    }

    throw e;
  }
}; /**
    * @summary Remove documents from the collection
    * @locus Anywhere
    * @method remove
    * @memberOf Mongo.Collection
    * @instance
    * @param {MongoSelector} selector Specifies which documents to remove
    * @param {Function} [callback] Optional.  If present, called with an error object as its argument.
    */

Mongo.Collection.prototype.remove = function remove(selector, callback) {
  selector = Mongo.Collection._rewriteSelector(selector);
  const wrappedCallback = wrapCallback(callback);

  if (this._isRemoteCollection()) {
    return this._callMutatorMethod("remove", [selector], wrappedCallback);
  } // it's my collection.  descend into the collection object
  // and propagate any exception.


  try {
    // If the user provided a callback and the collection implements this
    // operation asynchronously, then queryRet will be undefined, and the
    // result will be returned through the callback instead.
    return this._collection.remove(selector, wrappedCallback);
  } catch (e) {
    if (callback) {
      callback(e);
      return null;
    }

    throw e;
  }
}; // Determine if this collection is simply a minimongo representation of a real
// database on another server


Mongo.Collection.prototype._isRemoteCollection = function _isRemoteCollection() {
  // XXX see #MeteorServerNull
  return this._connection && this._connection !== Meteor.server;
}; // Convert the callback to not return a result if there is an error


function wrapCallback(callback, convertResult) {
  if (!callback) {
    return;
  } // If no convert function was passed in, just use a "blank function"


  convertResult = convertResult || _.identity;
  return (error, result) => {
    callback(error, !error && convertResult(result));
  };
} /**
   * @summary Modify one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
   * @locus Anywhere
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
   */

Mongo.Collection.prototype.upsert = function upsert(selector, modifier, options, callback) {
  if (!callback && typeof options === "function") {
    callback = options;
    options = {};
  }

  const updateOptions = _.extend({}, options, {
    _returnObject: true,
    upsert: true
  });

  return this.update(selector, modifier, updateOptions, callback);
}; // We'll actually design an index API later. For now, we just pass through to
// Mongo's, but make it synchronous.


Mongo.Collection.prototype._ensureIndex = function (index, options) {
  var self = this;
  if (!self._collection._ensureIndex) throw new Error("Can only call _ensureIndex on server collections");

  self._collection._ensureIndex(index, options);
};

Mongo.Collection.prototype._dropIndex = function (index) {
  var self = this;
  if (!self._collection._dropIndex) throw new Error("Can only call _dropIndex on server collections");

  self._collection._dropIndex(index);
};

Mongo.Collection.prototype._dropCollection = function () {
  var self = this;
  if (!self._collection.dropCollection) throw new Error("Can only call _dropCollection on server collections");

  self._collection.dropCollection();
};

Mongo.Collection.prototype._createCappedCollection = function (byteSize, maxDocuments) {
  var self = this;
  if (!self._collection._createCappedCollection) throw new Error("Can only call _createCappedCollection on server collections");

  self._collection._createCappedCollection(byteSize, maxDocuments);
}; /**
    * @summary Returns the [`Collection`](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html) object corresponding to this collection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
    * @locus Server
    */

Mongo.Collection.prototype.rawCollection = function () {
  var self = this;

  if (!self._collection.rawCollection) {
    throw new Error("Can only call rawCollection on server collections");
  }

  return self._collection.rawCollection();
}; /**
    * @summary Returns the [`Db`](http://mongodb.github.io/node-mongodb-native/2.2/api/Db.html) object corresponding to this collection's database connection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
    * @locus Server
    */

Mongo.Collection.prototype.rawDatabase = function () {
  var self = this;

  if (!(self._driver.mongo && self._driver.mongo.db)) {
    throw new Error("Can only call rawDatabase on server collections");
  }

  return self._driver.mongo.db;
}; /**
    * @summary Create a Mongo-style `ObjectID`.  If you don't specify a `hexString`, the `ObjectID` will generated randomly (not using MongoDB's ID construction rules).
    * @locus Anywhere
    * @class
    * @param {String} [hexString] Optional.  The 24-character hexadecimal contents of the ObjectID to create
    */

Mongo.ObjectID = MongoID.ObjectID; /**
                                    * @summary To create a cursor, use find. To access the documents in a cursor, use forEach, map, or fetch.
                                    * @class
                                    * @instanceName cursor
                                    */
Mongo.Cursor = LocalCollection.Cursor; /**
                                        * @deprecated in 0.9.1
                                        */
Mongo.Collection.Cursor = Mongo.Cursor; /**
                                         * @deprecated in 0.9.1
                                         */
Mongo.Collection.ObjectID = Mongo.ObjectID; /**
                                             * @deprecated in 0.9.1
                                             */
Meteor.Collection = Mongo.Collection; // Allow deny stuff is now in the allow-deny package

_.extend(Meteor.Collection.prototype, AllowDeny.CollectionPrototype);

function popCallbackFromArgs(args) {
  // Pull off any callback (or perhaps a 'callback' variable that was passed
  // in undefined, like how 'upsert' does it).
  if (args.length && (args[args.length - 1] === undefined || args[args.length - 1] instanceof Function)) {
    return args.pop();
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"connection_options.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/connection_options.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * @summary Allows for user specified connection options
 * @example http://mongodb.github.io/node-mongodb-native/2.2/reference/connecting/connection-settings/
 * @locus Server
 * @param {Object} options User specified Mongo connection options
 */Mongo.setConnectionOptions = function setConnectionOptions(options) {
  check(options, Object);
  Mongo._connectionOptions = options;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./node_modules/meteor/mongo/mongo_driver.js");
require("./node_modules/meteor/mongo/oplog_tailing.js");
require("./node_modules/meteor/mongo/observe_multiplex.js");
require("./node_modules/meteor/mongo/doc_fetcher.js");
require("./node_modules/meteor/mongo/polling_observe_driver.js");
require("./node_modules/meteor/mongo/oplog_observe_driver.js");
require("./node_modules/meteor/mongo/local_collection_driver.js");
require("./node_modules/meteor/mongo/remote_collection_driver.js");
require("./node_modules/meteor/mongo/collection.js");
require("./node_modules/meteor/mongo/connection_options.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.mongo = {}, {
  MongoInternals: MongoInternals,
  MongoTest: MongoTest,
  Mongo: Mongo
});

})();

//# sourceURL=meteor://💻app/packages/mongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vcGxvZ190YWlsaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vYnNlcnZlX211bHRpcGxleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vZG9jX2ZldGNoZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL3BvbGxpbmdfb2JzZXJ2ZV9kcml2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL29wbG9nX29ic2VydmVfZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9sb2NhbF9jb2xsZWN0aW9uX2RyaXZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vcmVtb3RlX2NvbGxlY3Rpb25fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb25uZWN0aW9uX29wdGlvbnMuanMiXSwibmFtZXMiOlsiTW9uZ29EQiIsIk5wbU1vZHVsZU1vbmdvZGIiLCJGdXR1cmUiLCJOcG0iLCJyZXF1aXJlIiwiTW9uZ29JbnRlcm5hbHMiLCJNb25nb1Rlc3QiLCJOcG1Nb2R1bGVzIiwibW9uZ29kYiIsInZlcnNpb24iLCJOcG1Nb2R1bGVNb25nb2RiVmVyc2lvbiIsIm1vZHVsZSIsIk5wbU1vZHVsZSIsInJlcGxhY2VOYW1lcyIsImZpbHRlciIsInRoaW5nIiwiXyIsImlzQXJyYXkiLCJtYXAiLCJiaW5kIiwicmV0IiwiZWFjaCIsInZhbHVlIiwia2V5IiwiVGltZXN0YW1wIiwicHJvdG90eXBlIiwiY2xvbmUiLCJtYWtlTW9uZ29MZWdhbCIsIm5hbWUiLCJ1bm1ha2VNb25nb0xlZ2FsIiwic3Vic3RyIiwicmVwbGFjZU1vbmdvQXRvbVdpdGhNZXRlb3IiLCJkb2N1bWVudCIsIkJpbmFyeSIsImJ1ZmZlciIsIlVpbnQ4QXJyYXkiLCJPYmplY3RJRCIsIk1vbmdvIiwidG9IZXhTdHJpbmciLCJzaXplIiwiRUpTT04iLCJmcm9tSlNPTlZhbHVlIiwidW5kZWZpbmVkIiwicmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28iLCJpc0JpbmFyeSIsIkJ1ZmZlciIsImZyb20iLCJfaXNDdXN0b21UeXBlIiwidG9KU09OVmFsdWUiLCJyZXBsYWNlVHlwZXMiLCJhdG9tVHJhbnNmb3JtZXIiLCJyZXBsYWNlZFRvcExldmVsQXRvbSIsInZhbCIsInZhbFJlcGxhY2VkIiwiTW9uZ29Db25uZWN0aW9uIiwidXJsIiwib3B0aW9ucyIsInNlbGYiLCJfb2JzZXJ2ZU11bHRpcGxleGVycyIsIl9vbkZhaWxvdmVySG9vayIsIkhvb2siLCJtb25nb09wdGlvbnMiLCJPYmplY3QiLCJhc3NpZ24iLCJhdXRvUmVjb25uZWN0IiwicmVjb25uZWN0VHJpZXMiLCJJbmZpbml0eSIsIl9jb25uZWN0aW9uT3B0aW9ucyIsInRlc3QiLCJuYXRpdmVfcGFyc2VyIiwiaGFzIiwicG9vbFNpemUiLCJkYiIsIl9wcmltYXJ5IiwiX29wbG9nSGFuZGxlIiwiX2RvY0ZldGNoZXIiLCJjb25uZWN0RnV0dXJlIiwiY29ubmVjdCIsIk1ldGVvciIsImJpbmRFbnZpcm9ubWVudCIsImVyciIsInNlcnZlckNvbmZpZyIsImlzTWFzdGVyRG9jIiwicHJpbWFyeSIsIm9uIiwia2luZCIsImRvYyIsImNhbGxiYWNrIiwibWUiLCJyZXNvbHZlciIsIndhaXQiLCJvcGxvZ1VybCIsIlBhY2thZ2UiLCJPcGxvZ0hhbmRsZSIsImRhdGFiYXNlTmFtZSIsIkRvY0ZldGNoZXIiLCJjbG9zZSIsIkVycm9yIiwib3Bsb2dIYW5kbGUiLCJzdG9wIiwid3JhcCIsInJhd0NvbGxlY3Rpb24iLCJjb2xsZWN0aW9uTmFtZSIsImZ1dHVyZSIsImNvbGxlY3Rpb24iLCJfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbiIsImJ5dGVTaXplIiwibWF4RG9jdW1lbnRzIiwiY3JlYXRlQ29sbGVjdGlvbiIsImNhcHBlZCIsIm1heCIsIl9tYXliZUJlZ2luV3JpdGUiLCJmZW5jZSIsIkREUFNlcnZlciIsIl9DdXJyZW50V3JpdGVGZW5jZSIsImdldCIsImJlZ2luV3JpdGUiLCJjb21taXR0ZWQiLCJfb25GYWlsb3ZlciIsInJlZ2lzdGVyIiwid3JpdGVDYWxsYmFjayIsIndyaXRlIiwicmVmcmVzaCIsInJlc3VsdCIsInJlZnJlc2hFcnIiLCJiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSIsIl9pbnNlcnQiLCJjb2xsZWN0aW9uX25hbWUiLCJzZW5kRXJyb3IiLCJlIiwiZXhwZWN0ZWQiLCJMb2NhbENvbGxlY3Rpb24iLCJfaXNQbGFpbk9iamVjdCIsImlkIiwiX2lkIiwiaW5zZXJ0Iiwic2FmZSIsIl9yZWZyZXNoIiwic2VsZWN0b3IiLCJyZWZyZXNoS2V5Iiwic3BlY2lmaWNJZHMiLCJfaWRzTWF0Y2hlZEJ5U2VsZWN0b3IiLCJleHRlbmQiLCJfcmVtb3ZlIiwid3JhcHBlZENhbGxiYWNrIiwiZHJpdmVyUmVzdWx0IiwidHJhbnNmb3JtUmVzdWx0IiwibnVtYmVyQWZmZWN0ZWQiLCJyZW1vdmUiLCJfZHJvcENvbGxlY3Rpb24iLCJjYiIsImRyb3BDb2xsZWN0aW9uIiwiZHJvcCIsIl9kcm9wRGF0YWJhc2UiLCJkcm9wRGF0YWJhc2UiLCJfdXBkYXRlIiwibW9kIiwiRnVuY3Rpb24iLCJtb25nb09wdHMiLCJ1cHNlcnQiLCJtdWx0aSIsImZ1bGxSZXN1bHQiLCJtb25nb1NlbGVjdG9yIiwibW9uZ29Nb2QiLCJpc01vZGlmeSIsIl9pc01vZGlmaWNhdGlvbk1vZCIsIl9mb3JiaWRSZXBsYWNlIiwia25vd25JZCIsIm5ld0RvYyIsIl9jcmVhdGVVcHNlcnREb2N1bWVudCIsImluc2VydGVkSWQiLCJnZW5lcmF0ZWRJZCIsInNpbXVsYXRlVXBzZXJ0V2l0aEluc2VydGVkSWQiLCJlcnJvciIsIl9yZXR1cm5PYmplY3QiLCJoYXNPd25Qcm9wZXJ0eSIsIiRzZXRPbkluc2VydCIsInVwZGF0ZSIsIm1ldGVvclJlc3VsdCIsIm1vbmdvUmVzdWx0IiwidXBzZXJ0ZWQiLCJsZW5ndGgiLCJuIiwiTlVNX09QVElNSVNUSUNfVFJJRVMiLCJfaXNDYW5ub3RDaGFuZ2VJZEVycm9yIiwiZXJybXNnIiwiaW5kZXhPZiIsIm1vbmdvT3B0c0ZvclVwZGF0ZSIsIm1vbmdvT3B0c0Zvckluc2VydCIsInJlcGxhY2VtZW50V2l0aElkIiwidHJpZXMiLCJkb1VwZGF0ZSIsImRvQ29uZGl0aW9uYWxJbnNlcnQiLCJtZXRob2QiLCJ3cmFwQXN5bmMiLCJhcHBseSIsImFyZ3VtZW50cyIsImZpbmQiLCJDdXJzb3IiLCJDdXJzb3JEZXNjcmlwdGlvbiIsImZpbmRPbmUiLCJsaW1pdCIsImZldGNoIiwiX2Vuc3VyZUluZGV4IiwiaW5kZXgiLCJpbmRleE5hbWUiLCJlbnN1cmVJbmRleCIsIl9kcm9wSW5kZXgiLCJkcm9wSW5kZXgiLCJDb2xsZWN0aW9uIiwiX3Jld3JpdGVTZWxlY3RvciIsIm1vbmdvIiwiY3Vyc29yRGVzY3JpcHRpb24iLCJfbW9uZ28iLCJfY3Vyc29yRGVzY3JpcHRpb24iLCJfc3luY2hyb25vdXNDdXJzb3IiLCJ0YWlsYWJsZSIsIl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvciIsInNlbGZGb3JJdGVyYXRpb24iLCJ1c2VUcmFuc2Zvcm0iLCJyZXdpbmQiLCJnZXRUcmFuc2Zvcm0iLCJ0cmFuc2Zvcm0iLCJfcHVibGlzaEN1cnNvciIsInN1YiIsIl9nZXRDb2xsZWN0aW9uTmFtZSIsIm9ic2VydmUiLCJjYWxsYmFja3MiLCJfb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyIsIm9ic2VydmVDaGFuZ2VzIiwibWV0aG9kcyIsIm9yZGVyZWQiLCJfb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkIiwiZXhjZXB0aW9uTmFtZSIsImZvckVhY2giLCJfb2JzZXJ2ZUNoYW5nZXMiLCJwaWNrIiwiY3Vyc29yT3B0aW9ucyIsInNvcnQiLCJza2lwIiwiYXdhaXRkYXRhIiwibnVtYmVyT2ZSZXRyaWVzIiwiT1BMT0dfQ09MTEVDVElPTiIsInRzIiwib3Bsb2dSZXBsYXkiLCJkYkN1cnNvciIsImZpZWxkcyIsIm1heFRpbWVNcyIsIm1heFRpbWVNUyIsImhpbnQiLCJTeW5jaHJvbm91c0N1cnNvciIsIl9kYkN1cnNvciIsIl9zZWxmRm9ySXRlcmF0aW9uIiwiX3RyYW5zZm9ybSIsIndyYXBUcmFuc2Zvcm0iLCJfc3luY2hyb25vdXNOZXh0T2JqZWN0IiwibmV4dE9iamVjdCIsIl9zeW5jaHJvbm91c0NvdW50IiwiY291bnQiLCJfdmlzaXRlZElkcyIsIl9JZE1hcCIsIl9uZXh0T2JqZWN0Iiwic2V0IiwidGhpc0FyZyIsIl9yZXdpbmQiLCJjYWxsIiwicmVzIiwicHVzaCIsImlkZW50aXR5IiwiYXBwbHlTa2lwTGltaXQiLCJnZXRSYXdPYmplY3RzIiwicmVzdWx0cyIsInRhaWwiLCJkb2NDYWxsYmFjayIsImN1cnNvciIsInN0b3BwZWQiLCJsYXN0VFMiLCJsb29wIiwibmV3U2VsZWN0b3IiLCIkZ3QiLCJzZXRUaW1lb3V0IiwiZGVmZXIiLCJfb2JzZXJ2ZUNoYW5nZXNUYWlsYWJsZSIsIm9ic2VydmVLZXkiLCJzdHJpbmdpZnkiLCJtdWx0aXBsZXhlciIsIm9ic2VydmVEcml2ZXIiLCJmaXJzdEhhbmRsZSIsIl9ub1lpZWxkc0FsbG93ZWQiLCJPYnNlcnZlTXVsdGlwbGV4ZXIiLCJvblN0b3AiLCJvYnNlcnZlSGFuZGxlIiwiT2JzZXJ2ZUhhbmRsZSIsIm1hdGNoZXIiLCJzb3J0ZXIiLCJjYW5Vc2VPcGxvZyIsImFsbCIsIl90ZXN0T25seVBvbGxDYWxsYmFjayIsIk1pbmltb25nbyIsIk1hdGNoZXIiLCJPcGxvZ09ic2VydmVEcml2ZXIiLCJjdXJzb3JTdXBwb3J0ZWQiLCJTb3J0ZXIiLCJmIiwiZHJpdmVyQ2xhc3MiLCJQb2xsaW5nT2JzZXJ2ZURyaXZlciIsIm1vbmdvSGFuZGxlIiwiX29ic2VydmVEcml2ZXIiLCJhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMiLCJsaXN0ZW5BbGwiLCJsaXN0ZW5DYWxsYmFjayIsImxpc3RlbmVycyIsImZvckVhY2hUcmlnZ2VyIiwidHJpZ2dlciIsIl9JbnZhbGlkYXRpb25Dcm9zc2JhciIsImxpc3RlbiIsImxpc3RlbmVyIiwidHJpZ2dlckNhbGxiYWNrIiwiYWRkZWRCZWZvcmUiLCJhZGRlZCIsIk1vbmdvVGltZXN0YW1wIiwiQ29ubmVjdGlvbiIsIlRPT19GQVJfQkVISU5EIiwicHJvY2VzcyIsImVudiIsIk1FVEVPUl9PUExPR19UT09fRkFSX0JFSElORCIsInNob3dUUyIsImdldEhpZ2hCaXRzIiwiZ2V0TG93Qml0cyIsImlkRm9yT3AiLCJvcCIsIm8iLCJvMiIsImRiTmFtZSIsIl9vcGxvZ1VybCIsIl9kYk5hbWUiLCJfb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uIiwiX29wbG9nVGFpbENvbm5lY3Rpb24iLCJfc3RvcHBlZCIsIl90YWlsSGFuZGxlIiwiX3JlYWR5RnV0dXJlIiwiX2Nyb3NzYmFyIiwiX0Nyb3NzYmFyIiwiZmFjdFBhY2thZ2UiLCJmYWN0TmFtZSIsIl9iYXNlT3Bsb2dTZWxlY3RvciIsIm5zIiwiUmVnRXhwIiwiX2VzY2FwZVJlZ0V4cCIsIiRvciIsIiRpbiIsIiRleGlzdHMiLCJfY2F0Y2hpbmdVcEZ1dHVyZXMiLCJfbGFzdFByb2Nlc3NlZFRTIiwiX29uU2tpcHBlZEVudHJpZXNIb29rIiwiZGVidWdQcmludEV4Y2VwdGlvbnMiLCJfZW50cnlRdWV1ZSIsIl9Eb3VibGVFbmRlZFF1ZXVlIiwiX3dvcmtlckFjdGl2ZSIsIl9zdGFydFRhaWxpbmciLCJvbk9wbG9nRW50cnkiLCJvcmlnaW5hbENhbGxiYWNrIiwibm90aWZpY2F0aW9uIiwiX2RlYnVnIiwic3RhY2siLCJsaXN0ZW5IYW5kbGUiLCJvblNraXBwZWRFbnRyaWVzIiwid2FpdFVudGlsQ2F1Z2h0VXAiLCJsYXN0RW50cnkiLCIkbmF0dXJhbCIsIl9zbGVlcEZvck1zIiwibGVzc1RoYW5PckVxdWFsIiwiaW5zZXJ0QWZ0ZXIiLCJncmVhdGVyVGhhbiIsInNwbGljZSIsIm1vbmdvZGJVcmkiLCJwYXJzZSIsImRhdGFiYXNlIiwiYWRtaW4iLCJjb21tYW5kIiwiaXNtYXN0ZXIiLCJzZXROYW1lIiwibGFzdE9wbG9nRW50cnkiLCJvcGxvZ1NlbGVjdG9yIiwiX21heWJlU3RhcnRXb3JrZXIiLCJyZXR1cm4iLCJpc0VtcHR5IiwicG9wIiwiY2xlYXIiLCJfc2V0TGFzdFByb2Nlc3NlZFRTIiwic2hpZnQiLCJKU09OIiwiZmlyZSIsInNlcXVlbmNlciIsIl9kZWZpbmVUb29GYXJCZWhpbmQiLCJfcmVzZXRUb29GYXJCZWhpbmQiLCJmYWN0cyIsIkZhY3RzIiwiaW5jcmVtZW50U2VydmVyRmFjdCIsIl9vcmRlcmVkIiwiX29uU3RvcCIsIl9xdWV1ZSIsIl9TeW5jaHJvbm91c1F1ZXVlIiwiX2hhbmRsZXMiLCJfY2FjaGUiLCJfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIiwiX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkIiwiY2FsbGJhY2tOYW1lcyIsImNhbGxiYWNrTmFtZSIsIl9hcHBseUNhbGxiYWNrIiwidG9BcnJheSIsImhhbmRsZSIsInNhZmVUb1J1blRhc2siLCJydW5UYXNrIiwiX3NlbmRBZGRzIiwicmVtb3ZlSGFuZGxlIiwiX3JlYWR5IiwiX3N0b3AiLCJmcm9tUXVlcnlFcnJvciIsInJlYWR5IiwicXVldWVUYXNrIiwicXVlcnlFcnJvciIsInRocm93Iiwib25GbHVzaCIsImlzUmVzb2x2ZWQiLCJhcmdzIiwiYXBwbHlDaGFuZ2UiLCJrZXlzIiwiaGFuZGxlSWQiLCJhZGQiLCJfYWRkZWRCZWZvcmUiLCJfYWRkZWQiLCJkb2NzIiwibmV4dE9ic2VydmVIYW5kbGVJZCIsIl9tdWx0aXBsZXhlciIsImJlZm9yZSIsIkZpYmVyIiwibW9uZ29Db25uZWN0aW9uIiwiX21vbmdvQ29ubmVjdGlvbiIsIl9jYWxsYmFja3NGb3JDYWNoZUtleSIsImNhY2hlS2V5IiwiY2hlY2siLCJTdHJpbmciLCJjbG9uZWREb2MiLCJydW4iLCJfbW9uZ29IYW5kbGUiLCJfc3RvcENhbGxiYWNrcyIsIl9yZXN1bHRzIiwiX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCIsIl9wZW5kaW5nV3JpdGVzIiwiX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCIsInRocm90dGxlIiwiX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkIiwicG9sbGluZ1Rocm90dGxlTXMiLCJfdGFza1F1ZXVlIiwibGlzdGVuZXJzSGFuZGxlIiwicG9sbGluZ0ludGVydmFsIiwicG9sbGluZ0ludGVydmFsTXMiLCJfcG9sbGluZ0ludGVydmFsIiwiaW50ZXJ2YWxIYW5kbGUiLCJzZXRJbnRlcnZhbCIsImNsZWFySW50ZXJ2YWwiLCJfcG9sbE1vbmdvIiwiX3N1c3BlbmRQb2xsaW5nIiwiX3Jlc3VtZVBvbGxpbmciLCJmaXJzdCIsIm5ld1Jlc3VsdHMiLCJvbGRSZXN1bHRzIiwid3JpdGVzRm9yQ3ljbGUiLCJjb2RlIiwibWVzc2FnZSIsIkFycmF5IiwiX2RpZmZRdWVyeUNoYW5nZXMiLCJ3IiwiYyIsIlBIQVNFIiwiUVVFUllJTkciLCJGRVRDSElORyIsIlNURUFEWSIsIlN3aXRjaGVkVG9RdWVyeSIsImZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5IiwiY3VycmVudElkIiwiX3VzZXNPcGxvZyIsImNvbXBhcmF0b3IiLCJnZXRDb21wYXJhdG9yIiwiaGVhcE9wdGlvbnMiLCJJZE1hcCIsIl9saW1pdCIsIl9jb21wYXJhdG9yIiwiX3NvcnRlciIsIl91bnB1Ymxpc2hlZEJ1ZmZlciIsIk1pbk1heEhlYXAiLCJfcHVibGlzaGVkIiwiTWF4SGVhcCIsIl9zYWZlQXBwZW5kVG9CdWZmZXIiLCJfc3RvcEhhbmRsZXMiLCJfcmVnaXN0ZXJQaGFzZUNoYW5nZSIsIl9tYXRjaGVyIiwicHJvamVjdGlvbiIsIl9wcm9qZWN0aW9uRm4iLCJfY29tcGlsZVByb2plY3Rpb24iLCJfc2hhcmVkUHJvamVjdGlvbiIsImNvbWJpbmVJbnRvUHJvamVjdGlvbiIsIl9zaGFyZWRQcm9qZWN0aW9uRm4iLCJfbmVlZFRvRmV0Y2giLCJfY3VycmVudGx5RmV0Y2hpbmciLCJfZmV0Y2hHZW5lcmF0aW9uIiwiX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSIsIl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5IiwiX25lZWRUb1BvbGxRdWVyeSIsIl9waGFzZSIsIl9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmciLCJfaGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmciLCJmaXJlZCIsIl9vcGxvZ09ic2VydmVEcml2ZXJzIiwib25CZWZvcmVGaXJlIiwiZHJpdmVycyIsImRyaXZlciIsIl9ydW5Jbml0aWFsUXVlcnkiLCJfYWRkUHVibGlzaGVkIiwib3ZlcmZsb3dpbmdEb2NJZCIsIm1heEVsZW1lbnRJZCIsIm92ZXJmbG93aW5nRG9jIiwiZXF1YWxzIiwicmVtb3ZlZCIsIl9hZGRCdWZmZXJlZCIsIl9yZW1vdmVQdWJsaXNoZWQiLCJlbXB0eSIsIm5ld0RvY0lkIiwibWluRWxlbWVudElkIiwiX3JlbW92ZUJ1ZmZlcmVkIiwiX2NoYW5nZVB1Ymxpc2hlZCIsIm9sZERvYyIsInByb2plY3RlZE5ldyIsInByb2plY3RlZE9sZCIsImNoYW5nZWQiLCJEaWZmU2VxdWVuY2UiLCJtYWtlQ2hhbmdlZEZpZWxkcyIsIm1heEJ1ZmZlcmVkSWQiLCJfYWRkTWF0Y2hpbmciLCJtYXhQdWJsaXNoZWQiLCJtYXhCdWZmZXJlZCIsInRvUHVibGlzaCIsImNhbkFwcGVuZFRvQnVmZmVyIiwiY2FuSW5zZXJ0SW50b0J1ZmZlciIsInRvQnVmZmVyIiwiX3JlbW92ZU1hdGNoaW5nIiwiX2hhbmRsZURvYyIsIm1hdGNoZXNOb3ciLCJkb2N1bWVudE1hdGNoZXMiLCJwdWJsaXNoZWRCZWZvcmUiLCJidWZmZXJlZEJlZm9yZSIsImNhY2hlZEJlZm9yZSIsIm1pbkJ1ZmZlcmVkIiwic3RheXNJblB1Ymxpc2hlZCIsInN0YXlzSW5CdWZmZXIiLCJfZmV0Y2hNb2RpZmllZERvY3VtZW50cyIsInRoaXNHZW5lcmF0aW9uIiwid2FpdGluZyIsImZ1dCIsIl9iZVN0ZWFkeSIsIndyaXRlcyIsInRvU3RyaW5nIiwiaXNSZXBsYWNlIiwiY2FuRGlyZWN0bHlNb2RpZnlEb2MiLCJtb2RpZmllckNhbkJlRGlyZWN0bHlBcHBsaWVkIiwiX21vZGlmeSIsImNhbkJlY29tZVRydWVCeU1vZGlmaWVyIiwiYWZmZWN0ZWRCeU1vZGlmaWVyIiwiX3J1blF1ZXJ5IiwiaW5pdGlhbCIsIl9kb25lUXVlcnlpbmciLCJfcG9sbFF1ZXJ5IiwibmV3QnVmZmVyIiwiX2N1cnNvckZvclF1ZXJ5IiwiaSIsIl9wdWJsaXNoTmV3UmVzdWx0cyIsIm9wdGlvbnNPdmVyd3JpdGUiLCJkZXNjcmlwdGlvbiIsImlkc1RvUmVtb3ZlIiwiX29wbG9nRW50cnlIYW5kbGUiLCJfbGlzdGVuZXJzSGFuZGxlIiwicGhhc2UiLCJub3ciLCJEYXRlIiwidGltZURpZmYiLCJfcGhhc2VTdGFydFRpbWUiLCJkaXNhYmxlT3Bsb2ciLCJfZGlzYWJsZU9wbG9nIiwiX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbiIsImhhc1doZXJlIiwiaGFzR2VvUXVlcnkiLCJtb2RpZmllciIsIm9wZXJhdGlvbiIsImZpZWxkIiwiTG9jYWxDb2xsZWN0aW9uRHJpdmVyIiwibm9Db25uQ29sbGVjdGlvbnMiLCJlbnN1cmVDb2xsZWN0aW9uIiwiY29sbGVjdGlvbnMiLCJvcGVuIiwiY29ubiIsIl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucyIsIlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJtb25nb191cmwiLCJtIiwiZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJvbmNlIiwiY29ubmVjdGlvbk9wdGlvbnMiLCJtb25nb1VybCIsIk1PTkdPX1VSTCIsIk1PTkdPX09QTE9HX1VSTCIsImNvbm5lY3Rpb24iLCJtYW5hZ2VyIiwiaWRHZW5lcmF0aW9uIiwiX2RyaXZlciIsIl9wcmV2ZW50QXV0b3B1Ymxpc2giLCJfbWFrZU5ld0lEIiwic3JjIiwiRERQIiwicmFuZG9tU3RyZWFtIiwiUmFuZG9tIiwiaW5zZWN1cmUiLCJoZXhTdHJpbmciLCJfY29ubmVjdGlvbiIsImlzQ2xpZW50Iiwic2VydmVyIiwiX2NvbGxlY3Rpb24iLCJfbmFtZSIsInJlZ2lzdGVyU3RvcmUiLCJvayIsImJlZ2luVXBkYXRlIiwiYmF0Y2hTaXplIiwicmVzZXQiLCJwYXVzZU9ic2VydmVycyIsIm1zZyIsIm1vbmdvSWQiLCJNb25nb0lEIiwiaWRQYXJzZSIsInJlcGxhY2UiLCIkdW5zZXQiLCIkc2V0IiwiZW5kVXBkYXRlIiwicmVzdW1lT2JzZXJ2ZXJzIiwic2F2ZU9yaWdpbmFscyIsInJldHJpZXZlT3JpZ2luYWxzIiwiZ2V0RG9jIiwiX2dldENvbGxlY3Rpb24iLCJfc3VwcHJlc3NTYW1lTmFtZUVycm9yIiwiY29uc29sZSIsIndhcm4iLCJsb2ciLCJkZWZpbmVNdXRhdGlvbk1ldGhvZHMiLCJfZGVmaW5lTXV0YXRpb25NZXRob2RzIiwidXNlRXhpc3RpbmciLCJhdXRvcHVibGlzaCIsInB1Ymxpc2giLCJpc19hdXRvIiwiX2dldEZpbmRTZWxlY3RvciIsIl9nZXRGaW5kT3B0aW9ucyIsIk1hdGNoIiwiT3B0aW9uYWwiLCJPYmplY3RJbmNsdWRpbmciLCJPbmVPZiIsIk51bWJlciIsImFyZ0FycmF5IiwiZmFsbGJhY2tJZCIsIl9zZWxlY3RvcklzSWQiLCJjcmVhdGUiLCJnZXRQcm90b3R5cGVPZiIsImdldE93blByb3BlcnR5RGVzY3JpcHRvcnMiLCJnZW5lcmF0ZUlkIiwiX2lzUmVtb3RlQ29sbGVjdGlvbiIsImVuY2xvc2luZyIsIl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbiIsImNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQiLCJ3cmFwQ2FsbGJhY2siLCJfY2FsbE11dGF0b3JNZXRob2QiLCJvcHRpb25zQW5kQ2FsbGJhY2siLCJwb3BDYWxsYmFja0Zyb21BcmdzIiwiY29udmVydFJlc3VsdCIsInVwZGF0ZU9wdGlvbnMiLCJyYXdEYXRhYmFzZSIsIkFsbG93RGVueSIsIkNvbGxlY3Rpb25Qcm90b3R5cGUiLCJzZXRDb25uZWN0aW9uT3B0aW9ucyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7Ozs7R0FTQSxJQUFJQSxVQUFVQyxnQkFBZDs7QUFDQSxJQUFJQyxTQUFTQyxJQUFJQyxPQUFKLENBQVksZUFBWixDQUFiOztBQUVBQyxpQkFBaUIsRUFBakI7QUFDQUMsWUFBWSxFQUFaO0FBRUFELGVBQWVFLFVBQWYsR0FBNEI7QUFDMUJDLFdBQVM7QUFDUEMsYUFBU0MsdUJBREY7QUFFUEMsWUFBUVg7QUFGRDtBQURpQixDQUE1QixDLENBT0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FLLGVBQWVPLFNBQWYsR0FBMkJaLE9BQTNCLEMsQ0FFQTtBQUNBOztBQUNBLElBQUlhLGVBQWUsVUFBVUMsTUFBVixFQUFrQkMsS0FBbEIsRUFBeUI7QUFDMUMsTUFBSSxPQUFPQSxLQUFQLEtBQWlCLFFBQXJCLEVBQStCO0FBQzdCLFFBQUlDLEVBQUVDLE9BQUYsQ0FBVUYsS0FBVixDQUFKLEVBQXNCO0FBQ3BCLGFBQU9DLEVBQUVFLEdBQUYsQ0FBTUgsS0FBTixFQUFhQyxFQUFFRyxJQUFGLENBQU9OLFlBQVAsRUFBcUIsSUFBckIsRUFBMkJDLE1BQTNCLENBQWIsQ0FBUDtBQUNEOztBQUNELFFBQUlNLE1BQU0sRUFBVjs7QUFDQUosTUFBRUssSUFBRixDQUFPTixLQUFQLEVBQWMsVUFBVU8sS0FBVixFQUFpQkMsR0FBakIsRUFBc0I7QUFDbENILFVBQUlOLE9BQU9TLEdBQVAsQ0FBSixJQUFtQlYsYUFBYUMsTUFBYixFQUFxQlEsS0FBckIsQ0FBbkI7QUFDRCxLQUZEOztBQUdBLFdBQU9GLEdBQVA7QUFDRDs7QUFDRCxTQUFPTCxLQUFQO0FBQ0QsQ0FaRCxDLENBY0E7QUFDQTtBQUNBOzs7QUFDQWYsUUFBUXdCLFNBQVIsQ0FBa0JDLFNB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O0FBQ0YsQzs7Ozs7Ozs7Ozs7QUNsdUJEOzs7OztHQU1BOVYsTUFBTXVvQixvQkFBTixHQUE2QixTQUFTQSxvQkFBVCxDQUErQnBuQixPQUEvQixFQUF3QztBQUNuRWlZLFFBQU1qWSxPQUFOLEVBQWVNLE1BQWY7QUFDQXpCLFFBQU04QixrQkFBTixHQUEyQlgsT0FBM0I7QUFDRCxDQUhELEMiLCJmaWxlIjoiL3BhY2thZ2VzL21vbmdvLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBQcm92aWRlIGEgc3luY2hyb25vdXMgQ29sbGVjdGlvbiBBUEkgdXNpbmcgZmliZXJzLCBiYWNrZWQgYnlcbiAqIE1vbmdvREIuICBUaGlzIGlzIG9ubHkgZm9yIHVzZSBvbiB0aGUgc2VydmVyLCBhbmQgbW9zdGx5IGlkZW50aWNhbFxuICogdG8gdGhlIGNsaWVudCBBUEkuXG4gKlxuICogTk9URTogdGhlIHB1YmxpYyBBUEkgbWV0aG9kcyBtdXN0IGJlIHJ1biB3aXRoaW4gYSBmaWJlci4gSWYgeW91IGNhbGxcbiAqIHRoZXNlIG91dHNpZGUgb2YgYSBmaWJlciB0aGV5IHdpbGwgZXhwbG9kZSFcbiAqL1xuXG52YXIgTW9uZ29EQiA9IE5wbU1vZHVsZU1vbmdvZGI7XG52YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuTW9uZ29JbnRlcm5hbHMgPSB7fTtcbk1vbmdvVGVzdCA9IHt9O1xuXG5Nb25nb0ludGVybmFscy5OcG1Nb2R1bGVzID0ge1xuICBtb25nb2RiOiB7XG4gICAgdmVyc2lvbjogTnBtTW9kdWxlTW9uZ29kYlZlcnNpb24sXG4gICAgbW9kdWxlOiBNb25nb0RCXG4gIH1cbn07XG5cbi8vIE9sZGVyIHZlcnNpb24gb2Ygd2hhdCBpcyBub3cgYXZhaWxhYmxlIHZpYVxuLy8gTW9uZ29JbnRlcm5hbHMuTnBtTW9kdWxlcy5tb25nb2RiLm1vZHVsZS4gIEl0IHdhcyBuZXZlciBkb2N1bWVudGVkLCBidXRcbi8vIHBlb3BsZSBkbyB1c2UgaXQuXG4vLyBYWFggQ09NUEFUIFdJVEggMS4wLjMuMlxuTW9uZ29JbnRlcm5hbHMuTnBtTW9kdWxlID0gTW9uZ29EQjtcblxuLy8gVGhpcyBpcyB1c2VkIHRvIGFkZCBvciByZW1vdmUgRUpTT04gZnJvbSB0aGUgYmVnaW5uaW5nIG9mIGV2ZXJ5dGhpbmcgbmVzdGVkXG4vLyBpbnNpZGUgYW4gRUpTT04gY3VzdG9tIHR5cGUuIEl0IHNob3VsZCBvbmx5IGJlIGNhbGxlZCBvbiBwdXJlIEpTT04hXG52YXIgcmVwbGFjZU5hbWVzID0gZnVuY3Rpb24gKGZpbHRlciwgdGhpbmcpIHtcbiAgaWYgKHR5cGVvZiB0aGluZyA9PT0gXCJvYmplY3RcIikge1xuICAgIGlmIChfLmlzQXJyYXkodGhpbmcpKSB7XG4gICAgICByZXR1cm4gXy5tYXAodGhpbmcsIF8uYmluZChyZXBsYWNlTmFtZXMsIG51bGwsIGZpbHRlcikpO1xuICAgIH1cbiAgICB2YXIgcmV0ID0ge307XG4gICAgXy5lYWNoKHRoaW5nLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgcmV0W2ZpbHRlcihrZXkpXSA9IHJlcGxhY2VOYW1lcyhmaWx0ZXIsIHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG4gIHJldHVybiB0aGluZztcbn07XG5cbi8vIEVuc3VyZSB0aGF0IEVKU09OLmNsb25lIGtlZXBzIGEgVGltZXN0YW1wIGFzIGEgVGltZXN0YW1wIChpbnN0ZWFkIG9mIGp1c3Rcbi8vIGRvaW5nIGEgc3RydWN0dXJhbCBjbG9uZSkuXG4vLyBYWFggaG93IG9rIGlzIHRoaXM/IHdoYXQgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGNvcGllcyBvZiBNb25nb0RCIGxvYWRlZD9cbk1vbmdvREIuVGltZXN0YW1wLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gVGltZXN0YW1wcyBzaG91bGQgYmUgaW1tdXRhYmxlLlxuICByZXR1cm4gdGhpcztcbn07XG5cbnZhciBtYWtlTW9uZ29MZWdhbCA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBcIkVKU09OXCIgKyBuYW1lOyB9O1xudmFyIHVubWFrZU1vbmdvTGVnYWwgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gbmFtZS5zdWJzdHIoNSk7IH07XG5cbnZhciByZXBsYWNlTW9uZ29BdG9tV2l0aE1ldGVvciA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLkJpbmFyeSkge1xuICAgIHZhciBidWZmZXIgPSBkb2N1bWVudC52YWx1ZSh0cnVlKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgfVxuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLk9iamVjdElEKSB7XG4gICAgcmV0dXJuIG5ldyBNb25nby5PYmplY3RJRChkb2N1bWVudC50b0hleFN0cmluZygpKTtcbiAgfVxuICBpZiAoZG9jdW1lbnRbXCJFSlNPTiR0eXBlXCJdICYmIGRvY3VtZW50W1wiRUpTT04kdmFsdWVcIl0gJiYgXy5zaXplKGRvY3VtZW50KSA9PT0gMikge1xuICAgIHJldHVybiBFSlNPTi5mcm9tSlNPTlZhbHVlKHJlcGxhY2VOYW1lcyh1bm1ha2VNb25nb0xlZ2FsLCBkb2N1bWVudCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuVGltZXN0YW1wKSB7XG4gICAgLy8gRm9yIG5vdywgdGhlIE1ldGVvciByZXByZXNlbnRhdGlvbiBvZiBhIE1vbmdvIHRpbWVzdGFtcCB0eXBlIChub3QgYSBkYXRlIVxuICAgIC8vIHRoaXMgaXMgYSB3ZWlyZCBpbnRlcm5hbCB0aGluZyB1c2VkIGluIHRoZSBvcGxvZyEpIGlzIHRoZSBzYW1lIGFzIHRoZVxuICAgIC8vIE1vbmdvIHJlcHJlc2VudGF0aW9uLiBXZSBuZWVkIHRvIGRvIHRoaXMgZXhwbGljaXRseSBvciBlbHNlIHdlIHdvdWxkIGRvIGFcbiAgICAvLyBzdHJ1Y3R1cmFsIGNsb25lIGFuZCBsb3NlIHRoZSBwcm90b3R5cGUuXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG52YXIgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28gPSBmdW5jdGlvbiAoZG9jdW1lbnQpIHtcbiAgaWYgKEVKU09OLmlzQmluYXJ5KGRvY3VtZW50KSkge1xuICAgIC8vIFRoaXMgZG9lcyBtb3JlIGNvcGllcyB0aGFuIHdlJ2QgbGlrZSwgYnV0IGlzIG5lY2Vzc2FyeSBiZWNhdXNlXG4gICAgLy8gTW9uZ29EQi5CU09OIG9ubHkgbG9va3MgbGlrZSBpdCB0YWtlcyBhIFVpbnQ4QXJyYXkgKGFuZCBkb2Vzbid0IGFjdHVhbGx5XG4gICAgLy8gc2VyaWFsaXplIGl0IGNvcnJlY3RseSkuXG4gICAgcmV0dXJuIG5ldyBNb25nb0RCLkJpbmFyeShCdWZmZXIuZnJvbShkb2N1bWVudCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKSB7XG4gICAgcmV0dXJuIG5ldyBNb25nb0RCLk9iamVjdElEKGRvY3VtZW50LnRvSGV4U3RyaW5nKCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuVGltZXN0YW1wKSB7XG4gICAgLy8gRm9yIG5vdywgdGhlIE1ldGVvciByZXByZXNlbnRhdGlvbiBvZiBhIE1vbmdvIHRpbWVzdGFtcCB0eXBlIChub3QgYSBkYXRlIVxuICAgIC8vIHRoaXMgaXMgYSB3ZWlyZCBpbnRlcm5hbCB0aGluZyB1c2VkIGluIHRoZSBvcGxvZyEpIGlzIHRoZSBzYW1lIGFzIHRoZVxuICAgIC8vIE1vbmdvIHJlcHJlc2VudGF0aW9uLiBXZSBuZWVkIHRvIGRvIHRoaXMgZXhwbGljaXRseSBvciBlbHNlIHdlIHdvdWxkIGRvIGFcbiAgICAvLyBzdHJ1Y3R1cmFsIGNsb25lIGFuZCBsb3NlIHRoZSBwcm90b3R5cGUuXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuICB9XG4gIGlmIChFSlNPTi5faXNDdXN0b21UeXBlKGRvY3VtZW50KSkge1xuICAgIHJldHVybiByZXBsYWNlTmFtZXMobWFrZU1vbmdvTGVnYWwsIEVKU09OLnRvSlNPTlZhbHVlKGRvY3VtZW50KSk7XG4gIH1cbiAgLy8gSXQgaXMgbm90IG9yZGluYXJpbHkgcG9zc2libGUgdG8gc3RpY2sgZG9sbGFyLXNpZ24ga2V5cyBpbnRvIG1vbmdvXG4gIC8vIHNvIHdlIGRvbid0IGJvdGhlciBjaGVja2luZyBmb3IgdGhpbmdzIHRoYXQgbmVlZCBlc2NhcGluZyBhdCB0aGlzIHRpbWUuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG52YXIgcmVwbGFjZVR5cGVzID0gZnVuY3Rpb24gKGRvY3VtZW50LCBhdG9tVHJhbnNmb3JtZXIpIHtcbiAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ29iamVjdCcgfHwgZG9jdW1lbnQgPT09IG51bGwpXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuXG4gIHZhciByZXBsYWNlZFRvcExldmVsQXRvbSA9IGF0b21UcmFuc2Zvcm1lcihkb2N1bWVudCk7XG4gIGlmIChyZXBsYWNlZFRvcExldmVsQXRvbSAhPT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiByZXBsYWNlZFRvcExldmVsQXRvbTtcblxuICB2YXIgcmV0ID0gZG9jdW1lbnQ7XG4gIF8uZWFjaChkb2N1bWVudCwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgdmFyIHZhbFJlcGxhY2VkID0gcmVwbGFjZVR5cGVzKHZhbCwgYXRvbVRyYW5zZm9ybWVyKTtcbiAgICBpZiAodmFsICE9PSB2YWxSZXBsYWNlZCkge1xuICAgICAgLy8gTGF6eSBjbG9uZS4gU2hhbGxvdyBjb3B5LlxuICAgICAgaWYgKHJldCA9PT0gZG9jdW1lbnQpXG4gICAgICAgIHJldCA9IF8uY2xvbmUoZG9jdW1lbnQpO1xuICAgICAgcmV0W2tleV0gPSB2YWxSZXBsYWNlZDtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcmV0O1xufTtcblxuXG5Nb25nb0Nvbm5lY3Rpb24gPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnMgPSB7fTtcbiAgc2VsZi5fb25GYWlsb3Zlckhvb2sgPSBuZXcgSG9vaztcblxuICB2YXIgbW9uZ29PcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgLy8gUmVjb25uZWN0IG9uIGVycm9yLlxuICAgIGF1dG9SZWNvbm5lY3Q6IHRydWUsXG4gICAgLy8gVHJ5IHRvIHJlY29ubmVjdCBmb3JldmVyLCBpbnN0ZWFkIG9mIHN0b3BwaW5nIGFmdGVyIDMwIHRyaWVzICh0aGVcbiAgICAvLyBkZWZhdWx0KSwgd2l0aCBlYWNoIGF0dGVtcHQgc2VwYXJhdGVkIGJ5IDEwMDBtcy5cbiAgICByZWNvbm5lY3RUcmllczogSW5maW5pdHlcbiAgfSwgTW9uZ28uX2Nvbm5lY3Rpb25PcHRpb25zKTtcblxuICAvLyBEaXNhYmxlIHRoZSBuYXRpdmUgcGFyc2VyIGJ5IGRlZmF1bHQsIHVubGVzcyBzcGVjaWZpY2FsbHkgZW5hYmxlZFxuICAvLyBpbiB0aGUgbW9uZ28gVVJMLlxuICAvLyAtIFRoZSBuYXRpdmUgZHJpdmVyIGNhbiBjYXVzZSBlcnJvcnMgd2hpY2ggbm9ybWFsbHkgd291bGQgYmVcbiAgLy8gICB0aHJvd24sIGNhdWdodCwgYW5kIGhhbmRsZWQgaW50byBzZWdmYXVsdHMgdGhhdCB0YWtlIGRvd24gdGhlXG4gIC8vICAgd2hvbGUgYXBwLlxuICAvLyAtIEJpbmFyeSBtb2R1bGVzIGRvbid0IHlldCB3b3JrIHdoZW4geW91IGJ1bmRsZSBhbmQgbW92ZSB0aGUgYnVuZGxlXG4gIC8vICAgdG8gYSBkaWZmZXJlbnQgcGxhdGZvcm0gKGFrYSBkZXBsb3kpXG4gIC8vIFdlIHNob3VsZCByZXZpc2l0IHRoaXMgYWZ0ZXIgYmluYXJ5IG5wbSBtb2R1bGUgc3VwcG9ydCBsYW5kcy5cbiAgaWYgKCEoL1tcXD8mXW5hdGl2ZV8/W3BQXWFyc2VyPS8udGVzdCh1cmwpKSkge1xuICAgIG1vbmdvT3B0aW9ucy5uYXRpdmVfcGFyc2VyID0gZmFsc2U7XG4gIH1cblxuICAvLyBJbnRlcm5hbGx5IHRoZSBvcGxvZyBjb25uZWN0aW9ucyBzcGVjaWZ5IHRoZWlyIG93biBwb29sU2l6ZVxuICAvLyB3aGljaCB3ZSBkb24ndCB3YW50IHRvIG92ZXJ3cml0ZSB3aXRoIGFueSB1c2VyIGRlZmluZWQgdmFsdWVcbiAgaWYgKF8uaGFzKG9wdGlvbnMsICdwb29sU2l6ZScpKSB7XG4gICAgLy8gSWYgd2UganVzdCBzZXQgdGhpcyBmb3IgXCJzZXJ2ZXJcIiwgcmVwbFNldCB3aWxsIG92ZXJyaWRlIGl0LiBJZiB3ZSBqdXN0XG4gICAgLy8gc2V0IGl0IGZvciByZXBsU2V0LCBpdCB3aWxsIGJlIGlnbm9yZWQgaWYgd2UncmUgbm90IHVzaW5nIGEgcmVwbFNldC5cbiAgICBtb25nb09wdGlvbnMucG9vbFNpemUgPSBvcHRpb25zLnBvb2xTaXplO1xuICB9XG5cbiAgc2VsZi5kYiA9IG51bGw7XG4gIC8vIFdlIGtlZXAgdHJhY2sgb2YgdGhlIFJlcGxTZXQncyBwcmltYXJ5LCBzbyB0aGF0IHdlIGNhbiB0cmlnZ2VyIGhvb2tzIHdoZW5cbiAgLy8gaXQgY2hhbmdlcy4gIFRoZSBOb2RlIGRyaXZlcidzIGpvaW5lZCBjYWxsYmFjayBzZWVtcyB0byBmaXJlIHdheSB0b29cbiAgLy8gb2Z0ZW4sIHdoaWNoIGlzIHdoeSB3ZSBuZWVkIHRvIHRyYWNrIGl0IG91cnNlbHZlcy5cbiAgc2VsZi5fcHJpbWFyeSA9IG51bGw7XG4gIHNlbGYuX29wbG9nSGFuZGxlID0gbnVsbDtcbiAgc2VsZi5fZG9jRmV0Y2hlciA9IG51bGw7XG5cblxuICB2YXIgY29ubmVjdEZ1dHVyZSA9IG5ldyBGdXR1cmU7XG4gIE1vbmdvREIuY29ubmVjdChcbiAgICB1cmwsXG4gICAgbW9uZ29PcHRpb25zLFxuICAgIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoXG4gICAgICBmdW5jdGlvbiAoZXJyLCBkYikge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmlyc3QsIGZpZ3VyZSBvdXQgd2hhdCB0aGUgY3VycmVudCBwcmltYXJ5IGlzLCBpZiBhbnkuXG4gICAgICAgIGlmIChkYi5zZXJ2ZXJDb25maWcuaXNNYXN0ZXJEb2MpIHtcbiAgICAgICAgICBzZWxmLl9wcmltYXJ5ID0gZGIuc2VydmVyQ29uZmlnLmlzTWFzdGVyRG9jLnByaW1hcnk7XG4gICAgICAgIH1cblxuICAgICAgICBkYi5zZXJ2ZXJDb25maWcub24oXG4gICAgICAgICAgJ2pvaW5lZCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24gKGtpbmQsIGRvYykge1xuICAgICAgICAgICAgaWYgKGtpbmQgPT09ICdwcmltYXJ5Jykge1xuICAgICAgICAgICAgICBpZiAoZG9jLnByaW1hcnkgIT09IHNlbGYuX3ByaW1hcnkpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9wcmltYXJ5ID0gZG9jLnByaW1hcnk7XG4gICAgICAgICAgICAgICAgc2VsZi5fb25GYWlsb3Zlckhvb2suZWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChkb2MubWUgPT09IHNlbGYuX3ByaW1hcnkpIHtcbiAgICAgICAgICAgICAgLy8gVGhlIHRoaW5nIHdlIHRob3VnaHQgd2FzIHByaW1hcnkgaXMgbm93IHNvbWV0aGluZyBvdGhlciB0aGFuXG4gICAgICAgICAgICAgIC8vIHByaW1hcnkuICBGb3JnZXQgdGhhdCB3ZSB0aG91Z2h0IGl0IHdhcyBwcmltYXJ5LiAgKFRoaXMgbWVhbnNcbiAgICAgICAgICAgICAgLy8gdGhhdCBpZiBhIHNlcnZlciBzdG9wcyBiZWluZyBwcmltYXJ5IGFuZCB0aGVuIHN0YXJ0cyBiZWluZ1xuICAgICAgICAgICAgICAvLyBwcmltYXJ5IGFnYWluIHdpdGhvdXQgYW5vdGhlciBzZXJ2ZXIgYmVjb21pbmcgcHJpbWFyeSBpbiB0aGVcbiAgICAgICAgICAgICAgLy8gbWlkZGxlLCB3ZSdsbCBjb3JyZWN0bHkgY291bnQgaXQgYXMgYSBmYWlsb3Zlci4pXG4gICAgICAgICAgICAgIHNlbGYuX3ByaW1hcnkgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcblxuICAgICAgICAvLyBBbGxvdyB0aGUgY29uc3RydWN0b3IgdG8gcmV0dXJuLlxuICAgICAgICBjb25uZWN0RnV0dXJlWydyZXR1cm4nXShkYik7XG4gICAgICB9LFxuICAgICAgY29ubmVjdEZ1dHVyZS5yZXNvbHZlcigpICAvLyBvbkV4Y2VwdGlvblxuICAgIClcbiAgKTtcblxuICAvLyBXYWl0IGZvciB0aGUgY29ubmVjdGlvbiB0byBiZSBzdWNjZXNzZnVsOyB0aHJvd3Mgb24gZmFpbHVyZS5cbiAgc2VsZi5kYiA9IGNvbm5lY3RGdXR1cmUud2FpdCgpO1xuXG4gIGlmIChvcHRpb25zLm9wbG9nVXJsICYmICEgUGFja2FnZVsnZGlzYWJsZS1vcGxvZyddKSB7XG4gICAgc2VsZi5fb3Bsb2dIYW5kbGUgPSBuZXcgT3Bsb2dIYW5kbGUob3B0aW9ucy5vcGxvZ1VybCwgc2VsZi5kYi5kYXRhYmFzZU5hbWUpO1xuICAgIHNlbGYuX2RvY0ZldGNoZXIgPSBuZXcgRG9jRmV0Y2hlcihzZWxmKTtcbiAgfVxufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCEgc2VsZi5kYilcbiAgICB0aHJvdyBFcnJvcihcImNsb3NlIGNhbGxlZCBiZWZvcmUgQ29ubmVjdGlvbiBjcmVhdGVkP1wiKTtcblxuICAvLyBYWFggcHJvYmFibHkgdW50ZXN0ZWRcbiAgdmFyIG9wbG9nSGFuZGxlID0gc2VsZi5fb3Bsb2dIYW5kbGU7XG4gIHNlbGYuX29wbG9nSGFuZGxlID0gbnVsbDtcbiAgaWYgKG9wbG9nSGFuZGxlKVxuICAgIG9wbG9nSGFuZGxlLnN0b3AoKTtcblxuICAvLyBVc2UgRnV0dXJlLndyYXAgc28gdGhhdCBlcnJvcnMgZ2V0IHRocm93bi4gVGhpcyBoYXBwZW5zIHRvXG4gIC8vIHdvcmsgZXZlbiBvdXRzaWRlIGEgZmliZXIgc2luY2UgdGhlICdjbG9zZScgbWV0aG9kIGlzIG5vdFxuICAvLyBhY3R1YWxseSBhc3luY2hyb25vdXMuXG4gIEZ1dHVyZS53cmFwKF8uYmluZChzZWxmLmRiLmNsb3NlLCBzZWxmLmRiKSkodHJ1ZSkud2FpdCgpO1xufTtcblxuLy8gUmV0dXJucyB0aGUgTW9uZ28gQ29sbGVjdGlvbiBvYmplY3Q7IG1heSB5aWVsZC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUucmF3Q29sbGVjdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCEgc2VsZi5kYilcbiAgICB0aHJvdyBFcnJvcihcInJhd0NvbGxlY3Rpb24gY2FsbGVkIGJlZm9yZSBDb25uZWN0aW9uIGNyZWF0ZWQ/XCIpO1xuXG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBzZWxmLmRiLmNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUsIGZ1dHVyZS5yZXNvbHZlcigpKTtcbiAgcmV0dXJuIGZ1dHVyZS53YWl0KCk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uID0gZnVuY3Rpb24gKFxuICAgIGNvbGxlY3Rpb25OYW1lLCBieXRlU2l6ZSwgbWF4RG9jdW1lbnRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoISBzZWxmLmRiKVxuICAgIHRocm93IEVycm9yKFwiX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24gY2FsbGVkIGJlZm9yZSBDb25uZWN0aW9uIGNyZWF0ZWQ/XCIpO1xuXG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG4gIHNlbGYuZGIuY3JlYXRlQ29sbGVjdGlvbihcbiAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICB7IGNhcHBlZDogdHJ1ZSwgc2l6ZTogYnl0ZVNpemUsIG1heDogbWF4RG9jdW1lbnRzIH0sXG4gICAgZnV0dXJlLnJlc29sdmVyKCkpO1xuICBmdXR1cmUud2FpdCgpO1xufTtcblxuLy8gVGhpcyBzaG91bGQgYmUgY2FsbGVkIHN5bmNocm9ub3VzbHkgd2l0aCBhIHdyaXRlLCB0byBjcmVhdGUgYVxuLy8gdHJhbnNhY3Rpb24gb24gdGhlIGN1cnJlbnQgd3JpdGUgZmVuY2UsIGlmIGFueS4gQWZ0ZXIgd2UgY2FuIHJlYWRcbi8vIHRoZSB3cml0ZSwgYW5kIGFmdGVyIG9ic2VydmVycyBoYXZlIGJlZW4gbm90aWZpZWQgKG9yIGF0IGxlYXN0LFxuLy8gYWZ0ZXIgdGhlIG9ic2VydmVyIG5vdGlmaWVycyBoYXZlIGFkZGVkIHRoZW1zZWx2ZXMgdG8gdGhlIHdyaXRlXG4vLyBmZW5jZSksIHlvdSBzaG91bGQgY2FsbCAnY29tbWl0dGVkKCknIG9uIHRoZSBvYmplY3QgcmV0dXJuZWQuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9tYXliZUJlZ2luV3JpdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBmZW5jZSA9IEREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UuZ2V0KCk7XG4gIGlmIChmZW5jZSkge1xuICAgIHJldHVybiBmZW5jZS5iZWdpbldyaXRlKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtjb21taXR0ZWQ6IGZ1bmN0aW9uICgpIHt9fTtcbiAgfVxufTtcblxuLy8gSW50ZXJuYWwgaW50ZXJmYWNlOiBhZGRzIGEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gdGhlIE1vbmdvIHByaW1hcnlcbi8vIGNoYW5nZXMuIFJldHVybnMgYSBzdG9wIGhhbmRsZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX29uRmFpbG92ZXIgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgcmV0dXJuIHRoaXMuX29uRmFpbG92ZXJIb29rLnJlZ2lzdGVyKGNhbGxiYWNrKTtcbn07XG5cblxuLy8vLy8vLy8vLy8vIFB1YmxpYyBBUEkgLy8vLy8vLy8vL1xuXG4vLyBUaGUgd3JpdGUgbWV0aG9kcyBibG9jayB1bnRpbCB0aGUgZGF0YWJhc2UgaGFzIGNvbmZpcm1lZCB0aGUgd3JpdGUgKGl0IG1heVxuLy8gbm90IGJlIHJlcGxpY2F0ZWQgb3Igc3RhYmxlIG9uIGRpc2ssIGJ1dCBvbmUgc2VydmVyIGhhcyBjb25maXJtZWQgaXQpIGlmIG5vXG4vLyBjYWxsYmFjayBpcyBwcm92aWRlZC4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCwgdGhlbiB0aGV5IGNhbGwgdGhlIGNhbGxiYWNrXG4vLyB3aGVuIHRoZSB3cml0ZSBpcyBjb25maXJtZWQuIFRoZXkgcmV0dXJuIG5vdGhpbmcgb24gc3VjY2VzcywgYW5kIHJhaXNlIGFuXG4vLyBleGNlcHRpb24gb24gZmFpbHVyZS5cbi8vXG4vLyBBZnRlciBtYWtpbmcgYSB3cml0ZSAod2l0aCBpbnNlcnQsIHVwZGF0ZSwgcmVtb3ZlKSwgb2JzZXJ2ZXJzIGFyZVxuLy8gbm90aWZpZWQgYXN5bmNocm9ub3VzbHkuIElmIHlvdSB3YW50IHRvIHJlY2VpdmUgYSBjYWxsYmFjayBvbmNlIGFsbFxuLy8gb2YgdGhlIG9ic2VydmVyIG5vdGlmaWNhdGlvbnMgaGF2ZSBsYW5kZWQgZm9yIHlvdXIgd3JpdGUsIGRvIHRoZVxuLy8gd3JpdGVzIGluc2lkZSBhIHdyaXRlIGZlbmNlIChzZXQgRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZSB0byBhIG5ld1xuLy8gX1dyaXRlRmVuY2UsIGFuZCB0aGVuIHNldCBhIGNhbGxiYWNrIG9uIHRoZSB3cml0ZSBmZW5jZS4pXG4vL1xuLy8gU2luY2Ugb3VyIGV4ZWN1dGlvbiBlbnZpcm9ubWVudCBpcyBzaW5nbGUtdGhyZWFkZWQsIHRoaXMgaXNcbi8vIHdlbGwtZGVmaW5lZCAtLSBhIHdyaXRlIFwiaGFzIGJlZW4gbWFkZVwiIGlmIGl0J3MgcmV0dXJuZWQsIGFuZCBhblxuLy8gb2JzZXJ2ZXIgXCJoYXMgYmVlbiBub3RpZmllZFwiIGlmIGl0cyBjYWxsYmFjayBoYXMgcmV0dXJuZWQuXG5cbnZhciB3cml0ZUNhbGxiYWNrID0gZnVuY3Rpb24gKHdyaXRlLCByZWZyZXNoLCBjYWxsYmFjaykge1xuICByZXR1cm4gZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgaWYgKCEgZXJyKSB7XG4gICAgICAvLyBYWFggV2UgZG9uJ3QgaGF2ZSB0byBydW4gdGhpcyBvbiBlcnJvciwgcmlnaHQ/XG4gICAgICB0cnkge1xuICAgICAgICByZWZyZXNoKCk7XG4gICAgICB9IGNhdGNoIChyZWZyZXNoRXJyKSB7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgIGNhbGxiYWNrKHJlZnJlc2hFcnIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyByZWZyZXNoRXJyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgIH0gZWxzZSBpZiAoZXJyKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9O1xufTtcblxudmFyIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIHJldHVybiBNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrLCBcIk1vbmdvIHdyaXRlXCIpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5faW5zZXJ0ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgZG9jdW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBzZW5kRXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChjYWxsYmFjaylcbiAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICB0aHJvdyBlO1xuICB9O1xuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihcIkZhaWx1cmUgdGVzdFwiKTtcbiAgICBlLmV4cGVjdGVkID0gdHJ1ZTtcbiAgICBzZW5kRXJyb3IoZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKCEoTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KGRvY3VtZW50KSAmJlxuICAgICAgICAhRUpTT04uX2lzQ3VzdG9tVHlwZShkb2N1bWVudCkpKSB7XG4gICAgc2VuZEVycm9yKG5ldyBFcnJvcihcbiAgICAgIFwiT25seSBwbGFpbiBvYmplY3RzIG1heSBiZSBpbnNlcnRlZCBpbnRvIE1vbmdvREJcIikpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICBNZXRlb3IucmVmcmVzaCh7Y29sbGVjdGlvbjogY29sbGVjdGlvbl9uYW1lLCBpZDogZG9jdW1lbnQuX2lkIH0pO1xuICB9O1xuICBjYWxsYmFjayA9IGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKHdyaXRlQ2FsbGJhY2sod3JpdGUsIHJlZnJlc2gsIGNhbGxiYWNrKSk7XG4gIHRyeSB7XG4gICAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbl9uYW1lKTtcbiAgICBjb2xsZWN0aW9uLmluc2VydChyZXBsYWNlVHlwZXMoZG9jdW1lbnQsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICAgICAgICAgICAgICAgICAgICB7c2FmZTogdHJ1ZX0sIGNhbGxiYWNrKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZXJyO1xuICB9XG59O1xuXG4vLyBDYXVzZSBxdWVyaWVzIHRoYXQgbWF5IGJlIGFmZmVjdGVkIGJ5IHRoZSBzZWxlY3RvciB0byBwb2xsIGluIHRoaXMgd3JpdGVcbi8vIGZlbmNlLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fcmVmcmVzaCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IpIHtcbiAgdmFyIHJlZnJlc2hLZXkgPSB7Y29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWV9O1xuICAvLyBJZiB3ZSBrbm93IHdoaWNoIGRvY3VtZW50cyB3ZSdyZSByZW1vdmluZywgZG9uJ3QgcG9sbCBxdWVyaWVzIHRoYXQgYXJlXG4gIC8vIHNwZWNpZmljIHRvIG90aGVyIGRvY3VtZW50cy4gKE5vdGUgdGhhdCBtdWx0aXBsZSBub3RpZmljYXRpb25zIGhlcmUgc2hvdWxkXG4gIC8vIG5vdCBjYXVzZSBtdWx0aXBsZSBwb2xscywgc2luY2UgYWxsIG91ciBsaXN0ZW5lciBpcyBkb2luZyBpcyBlbnF1ZXVlaW5nIGFcbiAgLy8gcG9sbC4pXG4gIHZhciBzcGVjaWZpY0lkcyA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICBpZiAoc3BlY2lmaWNJZHMpIHtcbiAgICBfLmVhY2goc3BlY2lmaWNJZHMsIGZ1bmN0aW9uIChpZCkge1xuICAgICAgTWV0ZW9yLnJlZnJlc2goXy5leHRlbmQoe2lkOiBpZH0sIHJlZnJlc2hLZXkpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBNZXRlb3IucmVmcmVzaChyZWZyZXNoS2V5KTtcbiAgfVxufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fcmVtb3ZlID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihcIkZhaWx1cmUgdGVzdFwiKTtcbiAgICBlLmV4cGVjdGVkID0gdHJ1ZTtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi5fcmVmcmVzaChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yKTtcbiAgfTtcbiAgY2FsbGJhY2sgPSBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSh3cml0ZUNhbGxiYWNrKHdyaXRlLCByZWZyZXNoLCBjYWxsYmFjaykpO1xuXG4gIHRyeSB7XG4gICAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbl9uYW1lKTtcbiAgICB2YXIgd3JhcHBlZENhbGxiYWNrID0gZnVuY3Rpb24oZXJyLCBkcml2ZXJSZXN1bHQpIHtcbiAgICAgIGNhbGxiYWNrKGVyciwgdHJhbnNmb3JtUmVzdWx0KGRyaXZlclJlc3VsdCkubnVtYmVyQWZmZWN0ZWQpO1xuICAgIH07XG4gICAgY29sbGVjdGlvbi5yZW1vdmUocmVwbGFjZVR5cGVzKHNlbGVjdG9yLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgICAgICAgICAgICAgICAgICAgIHtzYWZlOiB0cnVlfSwgd3JhcHBlZENhbGxiYWNrKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZXJyO1xuICB9XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9kcm9wQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICBNZXRlb3IucmVmcmVzaCh7Y29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBkcm9wQ29sbGVjdGlvbjogdHJ1ZX0pO1xuICB9O1xuICBjYiA9IGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKHdyaXRlQ2FsbGJhY2sod3JpdGUsIHJlZnJlc2gsIGNiKSk7XG5cbiAgdHJ5IHtcbiAgICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gICAgY29sbGVjdGlvbi5kcm9wKGNiKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHRocm93IGU7XG4gIH1cbn07XG5cbi8vIEZvciB0ZXN0aW5nIG9ubHkuICBTbGlnaHRseSBiZXR0ZXIgdGhhbiBgYy5yYXdEYXRhYmFzZSgpLmRyb3BEYXRhYmFzZSgpYFxuLy8gYmVjYXVzZSBpdCBsZXRzIHRoZSB0ZXN0J3MgZmVuY2Ugd2FpdCBmb3IgaXQgdG8gYmUgY29tcGxldGUuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9kcm9wRGF0YWJhc2UgPSBmdW5jdGlvbiAoY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICBNZXRlb3IucmVmcmVzaCh7IGRyb3BEYXRhYmFzZTogdHJ1ZSB9KTtcbiAgfTtcbiAgY2IgPSBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSh3cml0ZUNhbGxiYWNrKHdyaXRlLCByZWZyZXNoLCBjYikpO1xuXG4gIHRyeSB7XG4gICAgc2VsZi5kYi5kcm9wRGF0YWJhc2UoY2IpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IsIG1vZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCEgY2FsbGJhY2sgJiYgb3B0aW9ucyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSBudWxsO1xuICB9XG5cbiAgaWYgKGNvbGxlY3Rpb25fbmFtZSA9PT0gXCJfX19tZXRlb3JfZmFpbHVyZV90ZXN0X2NvbGxlY3Rpb25cIikge1xuICAgIHZhciBlID0gbmV3IEVycm9yKFwiRmFpbHVyZSB0ZXN0XCIpO1xuICAgIGUuZXhwZWN0ZWQgPSB0cnVlO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGV4cGxpY2l0IHNhZmV0eSBjaGVjay4gbnVsbCBhbmQgdW5kZWZpbmVkIGNhbiBjcmFzaCB0aGUgbW9uZ29cbiAgLy8gZHJpdmVyLiBBbHRob3VnaCB0aGUgbm9kZSBkcml2ZXIgYW5kIG1pbmltb25nbyBkbyAnc3VwcG9ydCdcbiAgLy8gbm9uLW9iamVjdCBtb2RpZmllciBpbiB0aGF0IHRoZXkgZG9uJ3QgY3Jhc2gsIHRoZXkgYXJlIG5vdFxuICAvLyBtZWFuaW5nZnVsIG9wZXJhdGlvbnMgYW5kIGRvIG5vdCBkbyBhbnl0aGluZy4gRGVmZW5zaXZlbHkgdGhyb3cgYW5cbiAgLy8gZXJyb3IgaGVyZS5cbiAgaWYgKCFtb2QgfHwgdHlwZW9mIG1vZCAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBtb2RpZmllci4gTW9kaWZpZXIgbXVzdCBiZSBhbiBvYmplY3QuXCIpO1xuXG4gIGlmICghKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChtb2QpICYmXG4gICAgICAgICFFSlNPTi5faXNDdXN0b21UeXBlKG1vZCkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJPbmx5IHBsYWluIG9iamVjdHMgbWF5IGJlIHVzZWQgYXMgcmVwbGFjZW1lbnRcIiArXG4gICAgICAgIFwiIGRvY3VtZW50cyBpbiBNb25nb0RCXCIpO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3JlZnJlc2goY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvcik7XG4gIH07XG4gIGNhbGxiYWNrID0gd3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2FsbGJhY2spO1xuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gICAgdmFyIG1vbmdvT3B0cyA9IHtzYWZlOiB0cnVlfTtcbiAgICAvLyBleHBsaWN0bHkgZW51bWVyYXRlIG9wdGlvbnMgdGhhdCBtaW5pbW9uZ28gc3VwcG9ydHNcbiAgICBpZiAob3B0aW9ucy51cHNlcnQpIG1vbmdvT3B0cy51cHNlcnQgPSB0cnVlO1xuICAgIGlmIChvcHRpb25zLm11bHRpKSBtb25nb09wdHMubXVsdGkgPSB0cnVlO1xuICAgIC8vIExldHMgeW91IGdldCBhIG1vcmUgbW9yZSBmdWxsIHJlc3VsdCBmcm9tIE1vbmdvREIuIFVzZSB3aXRoIGNhdXRpb246XG4gICAgLy8gbWlnaHQgbm90IHdvcmsgd2l0aCBDLnVwc2VydCAoYXMgb3Bwb3NlZCB0byBDLnVwZGF0ZSh7dXBzZXJ0OnRydWV9KSBvclxuICAgIC8vIHdpdGggc2ltdWxhdGVkIHVwc2VydC5cbiAgICBpZiAob3B0aW9ucy5mdWxsUmVzdWx0KSBtb25nb09wdHMuZnVsbFJlc3VsdCA9IHRydWU7XG5cbiAgICB2YXIgbW9uZ29TZWxlY3RvciA9IHJlcGxhY2VUeXBlcyhzZWxlY3RvciwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pO1xuICAgIHZhciBtb25nb01vZCA9IHJlcGxhY2VUeXBlcyhtb2QsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKTtcblxuICAgIHZhciBpc01vZGlmeSA9IExvY2FsQ29sbGVjdGlvbi5faXNNb2RpZmljYXRpb25Nb2QobW9uZ29Nb2QpO1xuXG4gICAgaWYgKG9wdGlvbnMuX2ZvcmJpZFJlcGxhY2UgJiYgIWlzTW9kaWZ5KSB7XG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKFwiSW52YWxpZCBtb2RpZmllci4gUmVwbGFjZW1lbnRzIGFyZSBmb3JiaWRkZW4uXCIpO1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdlJ3ZlIGFscmVhZHkgcnVuIHJlcGxhY2VUeXBlcy9yZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyBvblxuICAgIC8vIHNlbGVjdG9yIGFuZCBtb2QuICBXZSBhc3N1bWUgaXQgZG9lc24ndCBtYXR0ZXIsIGFzIGZhciBhc1xuICAgIC8vIHRoZSBiZWhhdmlvciBvZiBtb2RpZmllcnMgaXMgY29uY2VybmVkLCB3aGV0aGVyIGBfbW9kaWZ5YFxuICAgIC8vIGlzIHJ1biBvbiBFSlNPTiBvciBvbiBtb25nby1jb252ZXJ0ZWQgRUpTT04uXG5cbiAgICAvLyBSdW4gdGhpcyBjb2RlIHVwIGZyb250IHNvIHRoYXQgaXQgZmFpbHMgZmFzdCBpZiBzb21lb25lIHVzZXNcbiAgICAvLyBhIE1vbmdvIHVwZGF0ZSBvcGVyYXRvciB3ZSBkb24ndCBzdXBwb3J0LlxuICAgIGxldCBrbm93bklkO1xuICAgIGlmIChvcHRpb25zLnVwc2VydCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IG5ld0RvYyA9IExvY2FsQ29sbGVjdGlvbi5fY3JlYXRlVXBzZXJ0RG9jdW1lbnQoc2VsZWN0b3IsIG1vZCk7XG4gICAgICAgIGtub3duSWQgPSBuZXdEb2MuX2lkO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnVwc2VydCAmJlxuICAgICAgICAhIGlzTW9kaWZ5ICYmXG4gICAgICAgICEga25vd25JZCAmJlxuICAgICAgICBvcHRpb25zLmluc2VydGVkSWQgJiZcbiAgICAgICAgISAob3B0aW9ucy5pbnNlcnRlZElkIGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQgJiZcbiAgICAgICAgICAgb3B0aW9ucy5nZW5lcmF0ZWRJZCkpIHtcbiAgICAgIC8vIEluIGNhc2Ugb2YgYW4gdXBzZXJ0IHdpdGggYSByZXBsYWNlbWVudCwgd2hlcmUgdGhlcmUgaXMgbm8gX2lkIGRlZmluZWRcbiAgICAgIC8vIGluIGVpdGhlciB0aGUgcXVlcnkgb3IgdGhlIHJlcGxhY2VtZW50IGRvYywgbW9uZ28gd2lsbCBnZW5lcmF0ZSBhbiBpZCBpdHNlbGYuIFxuICAgICAgLy8gVGhlcmVmb3JlIHdlIG5lZWQgdGhpcyBzcGVjaWFsIHN0cmF0ZWd5IGlmIHdlIHdhbnQgdG8gY29udHJvbCB0aGUgaWQgb3Vyc2VsdmVzLlxuXG4gICAgICAvLyBXZSBkb24ndCBuZWVkIHRvIGRvIHRoaXMgd2hlbjpcbiAgICAgIC8vIC0gVGhpcyBpcyBub3QgYSByZXBsYWNlbWVudCwgc28gd2UgY2FuIGFkZCBhbiBfaWQgdG8gJHNldE9uSW5zZXJ0XG4gICAgICAvLyAtIFRoZSBpZCBpcyBkZWZpbmVkIGJ5IHF1ZXJ5IG9yIG1vZCB3ZSBjYW4ganVzdCBhZGQgaXQgdG8gdGhlIHJlcGxhY2VtZW50IGRvY1xuICAgICAgLy8gLSBUaGUgdXNlciBkaWQgbm90IHNwZWNpZnkgYW55IGlkIHByZWZlcmVuY2UgYW5kIHRoZSBpZCBpcyBhIE1vbmdvIE9iamVjdElkLCBcbiAgICAgIC8vICAgICB0aGVuIHdlIGNhbiBqdXN0IGxldCBNb25nbyBnZW5lcmF0ZSB0aGUgaWRcblxuICAgICAgc2ltdWxhdGVVcHNlcnRXaXRoSW5zZXJ0ZWRJZChcbiAgICAgICAgY29sbGVjdGlvbiwgbW9uZ29TZWxlY3RvciwgbW9uZ29Nb2QsIG9wdGlvbnMsXG4gICAgICAgIC8vIFRoaXMgY2FsbGJhY2sgZG9lcyBub3QgbmVlZCB0byBiZSBiaW5kRW52aXJvbm1lbnQnZWQgYmVjYXVzZVxuICAgICAgICAvLyBzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkKCkgd3JhcHMgaXQgYW5kIHRoZW4gcGFzc2VzIGl0IHRocm91Z2hcbiAgICAgICAgLy8gYmluZEVudmlyb25tZW50Rm9yV3JpdGUuXG4gICAgICAgIGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0KSB7XG4gICAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUgdmlhIGEgdXBzZXJ0KCkgY2FsbCwgdGhlbiBvcHRpb25zLl9yZXR1cm5PYmplY3Qgd2lsbFxuICAgICAgICAgIC8vIGJlIHNldCBhbmQgd2Ugc2hvdWxkIHJldHVybiB0aGUgd2hvbGUgb2JqZWN0LiBPdGhlcndpc2UsIHdlIHNob3VsZFxuICAgICAgICAgIC8vIGp1c3QgcmV0dXJuIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jcyB0byBtYXRjaCB0aGUgbW9uZ28gQVBJLlxuICAgICAgICAgIGlmIChyZXN1bHQgJiYgISBvcHRpb25zLl9yZXR1cm5PYmplY3QpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCByZXN1bHQubnVtYmVyQWZmZWN0ZWQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgcmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIFxuICAgICAgaWYgKG9wdGlvbnMudXBzZXJ0ICYmICFrbm93bklkICYmIG9wdGlvbnMuaW5zZXJ0ZWRJZCAmJiBpc01vZGlmeSkge1xuICAgICAgICBpZiAoIW1vbmdvTW9kLmhhc093blByb3BlcnR5KCckc2V0T25JbnNlcnQnKSkge1xuICAgICAgICAgIG1vbmdvTW9kLiRzZXRPbkluc2VydCA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGtub3duSWQgPSBvcHRpb25zLmluc2VydGVkSWQ7XG4gICAgICAgIE9iamVjdC5hc3NpZ24obW9uZ29Nb2QuJHNldE9uSW5zZXJ0LCByZXBsYWNlVHlwZXMoe19pZDogb3B0aW9ucy5pbnNlcnRlZElkfSwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29sbGVjdGlvbi51cGRhdGUoXG4gICAgICAgIG1vbmdvU2VsZWN0b3IsIG1vbmdvTW9kLCBtb25nb09wdHMsXG4gICAgICAgIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgICAgICAgIGlmICghIGVycikge1xuICAgICAgICAgICAgdmFyIG1ldGVvclJlc3VsdCA9IHRyYW5zZm9ybVJlc3VsdChyZXN1bHQpO1xuICAgICAgICAgICAgaWYgKG1ldGVvclJlc3VsdCAmJiBvcHRpb25zLl9yZXR1cm5PYmplY3QpIHtcbiAgICAgICAgICAgICAgLy8gSWYgdGhpcyB3YXMgYW4gdXBzZXJ0KCkgY2FsbCwgYW5kIHdlIGVuZGVkIHVwXG4gICAgICAgICAgICAgIC8vIGluc2VydGluZyBhIG5ldyBkb2MgYW5kIHdlIGtub3cgaXRzIGlkLCB0aGVuXG4gICAgICAgICAgICAgIC8vIHJldHVybiB0aGF0IGlkIGFzIHdlbGwuXG4gICAgICAgICAgICAgIGlmIChvcHRpb25zLnVwc2VydCAmJiBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCkge1xuICAgICAgICAgICAgICAgIGlmIChrbm93bklkKSB7XG4gICAgICAgICAgICAgICAgICBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCA9IGtub3duSWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCBpbnN0YW5jZW9mIE1vbmdvREIuT2JqZWN0SUQpIHtcbiAgICAgICAgICAgICAgICAgIG1ldGVvclJlc3VsdC5pbnNlcnRlZElkID0gbmV3IE1vbmdvLk9iamVjdElEKG1ldGVvclJlc3VsdC5pbnNlcnRlZElkLnRvSGV4U3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbWV0ZW9yUmVzdWx0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbWV0ZW9yUmVzdWx0Lm51bWJlckFmZmVjdGVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlO1xuICB9XG59O1xuXG52YXIgdHJhbnNmb3JtUmVzdWx0ID0gZnVuY3Rpb24gKGRyaXZlclJlc3VsdCkge1xuICB2YXIgbWV0ZW9yUmVzdWx0ID0geyBudW1iZXJBZmZlY3RlZDogMCB9O1xuICBpZiAoZHJpdmVyUmVzdWx0KSB7XG4gICAgdmFyIG1vbmdvUmVzdWx0ID0gZHJpdmVyUmVzdWx0LnJlc3VsdDtcblxuICAgIC8vIE9uIHVwZGF0ZXMgd2l0aCB1cHNlcnQ6dHJ1ZSwgdGhlIGluc2VydGVkIHZhbHVlcyBjb21lIGFzIGEgbGlzdCBvZlxuICAgIC8vIHVwc2VydGVkIHZhbHVlcyAtLSBldmVuIHdpdGggb3B0aW9ucy5tdWx0aSwgd2hlbiB0aGUgdXBzZXJ0IGRvZXMgaW5zZXJ0LFxuICAgIC8vIGl0IG9ubHkgaW5zZXJ0cyBvbmUgZWxlbWVudC5cbiAgICBpZiAobW9uZ29SZXN1bHQudXBzZXJ0ZWQpIHtcbiAgICAgIG1ldGVvclJlc3VsdC5udW1iZXJBZmZlY3RlZCArPSBtb25nb1Jlc3VsdC51cHNlcnRlZC5sZW5ndGg7XG5cbiAgICAgIGlmIChtb25nb1Jlc3VsdC51cHNlcnRlZC5sZW5ndGggPT0gMSkge1xuICAgICAgICBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCA9IG1vbmdvUmVzdWx0LnVwc2VydGVkWzBdLl9pZDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWV0ZW9yUmVzdWx0Lm51bWJlckFmZmVjdGVkID0gbW9uZ29SZXN1bHQubjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWV0ZW9yUmVzdWx0O1xufTtcblxuXG52YXIgTlVNX09QVElNSVNUSUNfVFJJRVMgPSAzO1xuXG4vLyBleHBvc2VkIGZvciB0ZXN0aW5nXG5Nb25nb0Nvbm5lY3Rpb24uX2lzQ2Fubm90Q2hhbmdlSWRFcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcblxuICAvLyBNb25nbyAzLjIuKiByZXR1cm5zIGVycm9yIGFzIG5leHQgT2JqZWN0OlxuICAvLyB7bmFtZTogU3RyaW5nLCBjb2RlOiBOdW1iZXIsIGVycm1zZzogU3RyaW5nfVxuICAvLyBPbGRlciBNb25nbyByZXR1cm5zOlxuICAvLyB7bmFtZTogU3RyaW5nLCBjb2RlOiBOdW1iZXIsIGVycjogU3RyaW5nfVxuICB2YXIgZXJyb3IgPSBlcnIuZXJybXNnIHx8IGVyci5lcnI7XG5cbiAgLy8gV2UgZG9uJ3QgdXNlIHRoZSBlcnJvciBjb2RlIGhlcmVcbiAgLy8gYmVjYXVzZSB0aGUgZXJyb3IgY29kZSB3ZSBvYnNlcnZlZCBpdCBwcm9kdWNpbmcgKDE2ODM3KSBhcHBlYXJzIHRvIGJlXG4gIC8vIGEgZmFyIG1vcmUgZ2VuZXJpYyBlcnJvciBjb2RlIGJhc2VkIG9uIGV4YW1pbmluZyB0aGUgc291cmNlLlxuICBpZiAoZXJyb3IuaW5kZXhPZignVGhlIF9pZCBmaWVsZCBjYW5ub3QgYmUgY2hhbmdlZCcpID09PSAwXG4gICAgfHwgZXJyb3IuaW5kZXhPZihcInRoZSAoaW1tdXRhYmxlKSBmaWVsZCAnX2lkJyB3YXMgZm91bmQgdG8gaGF2ZSBiZWVuIGFsdGVyZWQgdG8gX2lkXCIpICE9PSAtMSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIHNpbXVsYXRlVXBzZXJ0V2l0aEluc2VydGVkSWQgPSBmdW5jdGlvbiAoY29sbGVjdGlvbiwgc2VsZWN0b3IsIG1vZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIC8vIFNUUkFURUdZOiBGaXJzdCB0cnkgZG9pbmcgYW4gdXBzZXJ0IHdpdGggYSBnZW5lcmF0ZWQgSUQuXG4gIC8vIElmIHRoaXMgdGhyb3dzIGFuIGVycm9yIGFib3V0IGNoYW5naW5nIHRoZSBJRCBvbiBhbiBleGlzdGluZyBkb2N1bWVudFxuICAvLyB0aGVuIHdpdGhvdXQgYWZmZWN0aW5nIHRoZSBkYXRhYmFzZSwgd2Uga25vdyB3ZSBzaG91bGQgcHJvYmFibHkgdHJ5XG4gIC8vIGFuIHVwZGF0ZSB3aXRob3V0IHRoZSBnZW5lcmF0ZWQgSUQuIElmIGl0IGFmZmVjdGVkIDAgZG9jdW1lbnRzLCBcbiAgLy8gdGhlbiB3aXRob3V0IGFmZmVjdGluZyB0aGUgZGF0YWJhc2UsIHdlIHRoZSBkb2N1bWVudCB0aGF0IGZpcnN0XG4gIC8vIGdhdmUgdGhlIGVycm9yIGlzIHByb2JhYmx5IHJlbW92ZWQgYW5kIHdlIG5lZWQgdG8gdHJ5IGFuIGluc2VydCBhZ2FpblxuICAvLyBXZSBnbyBiYWNrIHRvIHN0ZXAgb25lIGFuZCByZXBlYXQuXG4gIC8vIExpa2UgYWxsIFwib3B0aW1pc3RpYyB3cml0ZVwiIHNjaGVtZXMsIHdlIHJlbHkgb24gdGhlIGZhY3QgdGhhdCBpdCdzXG4gIC8vIHVubGlrZWx5IG91ciB3cml0ZXMgd2lsbCBjb250aW51ZSB0byBiZSBpbnRlcmZlcmVkIHdpdGggdW5kZXIgbm9ybWFsXG4gIC8vIGNpcmN1bXN0YW5jZXMgKHRob3VnaCBzdWZmaWNpZW50bHkgaGVhdnkgY29udGVudGlvbiB3aXRoIHdyaXRlcnNcbiAgLy8gZGlzYWdyZWVpbmcgb24gdGhlIGV4aXN0ZW5jZSBvZiBhbiBvYmplY3Qgd2lsbCBjYXVzZSB3cml0ZXMgdG8gZmFpbFxuICAvLyBpbiB0aGVvcnkpLlxuXG4gIHZhciBpbnNlcnRlZElkID0gb3B0aW9ucy5pbnNlcnRlZElkOyAvLyBtdXN0IGV4aXN0XG4gIHZhciBtb25nb09wdHNGb3JVcGRhdGUgPSB7XG4gICAgc2FmZTogdHJ1ZSxcbiAgICBtdWx0aTogb3B0aW9ucy5tdWx0aVxuICB9O1xuICB2YXIgbW9uZ29PcHRzRm9ySW5zZXJ0ID0ge1xuICAgIHNhZmU6IHRydWUsXG4gICAgdXBzZXJ0OiB0cnVlXG4gIH07XG5cbiAgdmFyIHJlcGxhY2VtZW50V2l0aElkID0gT2JqZWN0LmFzc2lnbihcbiAgICByZXBsYWNlVHlwZXMoe19pZDogaW5zZXJ0ZWRJZH0sIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICBtb2QpO1xuXG4gIHZhciB0cmllcyA9IE5VTV9PUFRJTUlTVElDX1RSSUVTO1xuXG4gIHZhciBkb1VwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0cmllcy0tO1xuICAgIGlmICghIHRyaWVzKSB7XG4gICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJVcHNlcnQgZmFpbGVkIGFmdGVyIFwiICsgTlVNX09QVElNSVNUSUNfVFJJRVMgKyBcIiB0cmllcy5cIikpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb2xsZWN0aW9uLnVwZGF0ZShzZWxlY3RvciwgbW9kLCBtb25nb09wdHNGb3JVcGRhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZShmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ICYmIHJlc3VsdC5yZXN1bHQubiAhPSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyQWZmZWN0ZWQ6IHJlc3VsdC5yZXN1bHQublxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvQ29uZGl0aW9uYWxJbnNlcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgZG9Db25kaXRpb25hbEluc2VydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb2xsZWN0aW9uLnVwZGF0ZShzZWxlY3RvciwgcmVwbGFjZW1lbnRXaXRoSWQsIG1vbmdvT3B0c0Zvckluc2VydCxcbiAgICAgICAgICAgICAgICAgICAgICBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZShmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlndXJlIG91dCBpZiB0aGlzIGlzIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCJjYW5ub3QgY2hhbmdlIF9pZCBvZiBkb2N1bWVudFwiIGVycm9yLCBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgc28sIHRyeSBkb1VwZGF0ZSgpIGFnYWluLCB1cCB0byAzIHRpbWVzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoTW9uZ29Db25uZWN0aW9uLl9pc0Nhbm5vdENoYW5nZUlkRXJyb3IoZXJyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvVXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlckFmZmVjdGVkOiByZXN1bHQucmVzdWx0LnVwc2VydGVkLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRlZElkOiBpbnNlcnRlZElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gIH07XG5cbiAgZG9VcGRhdGUoKTtcbn07XG5cbl8uZWFjaChbXCJpbnNlcnRcIiwgXCJ1cGRhdGVcIiwgXCJyZW1vdmVcIiwgXCJkcm9wQ29sbGVjdGlvblwiLCBcImRyb3BEYXRhYmFzZVwiXSwgZnVuY3Rpb24gKG1ldGhvZCkge1xuICBNb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbiAoLyogYXJndW1lbnRzICovKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBNZXRlb3Iud3JhcEFzeW5jKHNlbGZbXCJfXCIgKyBtZXRob2RdKS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuICB9O1xufSk7XG5cbi8vIFhYWCBNb25nb0Nvbm5lY3Rpb24udXBzZXJ0KCkgZG9lcyBub3QgcmV0dXJuIHRoZSBpZCBvZiB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnRcbi8vIHVubGVzcyB5b3Ugc2V0IGl0IGV4cGxpY2l0bHkgaW4gdGhlIHNlbGVjdG9yIG9yIG1vZGlmaWVyIChhcyBhIHJlcGxhY2VtZW50XG4vLyBkb2MpLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS51cHNlcnQgPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBtb2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiICYmICEgY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgcmV0dXJuIHNlbGYudXBkYXRlKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3RvciwgbW9kLFxuICAgICAgICAgICAgICAgICAgICAgXy5leHRlbmQoe30sIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgdXBzZXJ0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICBfcmV0dXJuT2JqZWN0OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICB9KSwgY2FsbGJhY2spO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpXG4gICAgc2VsZWN0b3IgPSB7fTtcblxuICByZXR1cm4gbmV3IEN1cnNvcihcbiAgICBzZWxmLCBuZXcgQ3Vyc29yRGVzY3JpcHRpb24oY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBvcHRpb25zKSk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmZpbmRPbmUgPSBmdW5jdGlvbiAoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpXG4gICAgc2VsZWN0b3IgPSB7fTtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5saW1pdCA9IDE7XG4gIHJldHVybiBzZWxmLmZpbmQoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykuZmV0Y2goKVswXTtcbn07XG5cbi8vIFdlJ2xsIGFjdHVhbGx5IGRlc2lnbiBhbiBpbmRleCBBUEkgbGF0ZXIuIEZvciBub3csIHdlIGp1c3QgcGFzcyB0aHJvdWdoIHRvXG4vLyBNb25nbydzLCBidXQgbWFrZSBpdCBzeW5jaHJvbm91cy5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Vuc3VyZUluZGV4ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIFdlIGV4cGVjdCB0aGlzIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCBzdGFydHVwLCBub3QgZnJvbSB3aXRoaW4gYSBtZXRob2QsXG4gIC8vIHNvIHdlIGRvbid0IGludGVyYWN0IHdpdGggdGhlIHdyaXRlIGZlbmNlLlxuICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlO1xuICB2YXIgaW5kZXhOYW1lID0gY29sbGVjdGlvbi5lbnN1cmVJbmRleChpbmRleCwgb3B0aW9ucywgZnV0dXJlLnJlc29sdmVyKCkpO1xuICBmdXR1cmUud2FpdCgpO1xufTtcbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Ryb3BJbmRleCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgaW5kZXgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIFRoaXMgZnVuY3Rpb24gaXMgb25seSB1c2VkIGJ5IHRlc3QgY29kZSwgbm90IHdpdGhpbiBhIG1ldGhvZCwgc28gd2UgZG9uJ3RcbiAgLy8gaW50ZXJhY3Qgd2l0aCB0aGUgd3JpdGUgZmVuY2UuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgdmFyIGZ1dHVyZSA9IG5ldyBGdXR1cmU7XG4gIHZhciBpbmRleE5hbWUgPSBjb2xsZWN0aW9uLmRyb3BJbmRleChpbmRleCwgZnV0dXJlLnJlc29sdmVyKCkpO1xuICBmdXR1cmUud2FpdCgpO1xufTtcblxuLy8gQ1VSU09SU1xuXG4vLyBUaGVyZSBhcmUgc2V2ZXJhbCBjbGFzc2VzIHdoaWNoIHJlbGF0ZSB0byBjdXJzb3JzOlxuLy9cbi8vIEN1cnNvckRlc2NyaXB0aW9uIHJlcHJlc2VudHMgdGhlIGFyZ3VtZW50cyB1c2VkIHRvIGNvbnN0cnVjdCBhIGN1cnNvcjpcbi8vIGNvbGxlY3Rpb25OYW1lLCBzZWxlY3RvciwgYW5kIChmaW5kKSBvcHRpb25zLiAgQmVjYXVzZSBpdCBpcyB1c2VkIGFzIGEga2V5XG4vLyBmb3IgY3Vyc29yIGRlLWR1cCwgZXZlcnl0aGluZyBpbiBpdCBzaG91bGQgZWl0aGVyIGJlIEpTT04tc3RyaW5naWZpYWJsZSBvclxuLy8gbm90IGFmZmVjdCBvYnNlcnZlQ2hhbmdlcyBvdXRwdXQgKGVnLCBvcHRpb25zLnRyYW5zZm9ybSBmdW5jdGlvbnMgYXJlIG5vdFxuLy8gc3RyaW5naWZpYWJsZSBidXQgZG8gbm90IGFmZmVjdCBvYnNlcnZlQ2hhbmdlcykuXG4vL1xuLy8gU3luY2hyb25vdXNDdXJzb3IgaXMgYSB3cmFwcGVyIGFyb3VuZCBhIE1vbmdvREIgY3Vyc29yXG4vLyB3aGljaCBpbmNsdWRlcyBmdWxseS1zeW5jaHJvbm91cyB2ZXJzaW9ucyBvZiBmb3JFYWNoLCBldGMuXG4vL1xuLy8gQ3Vyc29yIGlzIHRoZSBjdXJzb3Igb2JqZWN0IHJldHVybmVkIGZyb20gZmluZCgpLCB3aGljaCBpbXBsZW1lbnRzIHRoZVxuLy8gZG9jdW1lbnRlZCBNb25nby5Db2xsZWN0aW9uIGN1cnNvciBBUEkuICBJdCB3cmFwcyBhIEN1cnNvckRlc2NyaXB0aW9uIGFuZCBhXG4vLyBTeW5jaHJvbm91c0N1cnNvciAobGF6aWx5OiBpdCBkb2Vzbid0IGNvbnRhY3QgTW9uZ28gdW50aWwgeW91IGNhbGwgYSBtZXRob2Rcbi8vIGxpa2UgZmV0Y2ggb3IgZm9yRWFjaCBvbiBpdCkuXG4vL1xuLy8gT2JzZXJ2ZUhhbmRsZSBpcyB0aGUgXCJvYnNlcnZlIGhhbmRsZVwiIHJldHVybmVkIGZyb20gb2JzZXJ2ZUNoYW5nZXMuIEl0IGhhcyBhXG4vLyByZWZlcmVuY2UgdG8gYW4gT2JzZXJ2ZU11bHRpcGxleGVyLlxuLy9cbi8vIE9ic2VydmVNdWx0aXBsZXhlciBhbGxvd3MgbXVsdGlwbGUgaWRlbnRpY2FsIE9ic2VydmVIYW5kbGVzIHRvIGJlIGRyaXZlbiBieSBhXG4vLyBzaW5nbGUgb2JzZXJ2ZSBkcml2ZXIuXG4vL1xuLy8gVGhlcmUgYXJlIHR3byBcIm9ic2VydmUgZHJpdmVyc1wiIHdoaWNoIGRyaXZlIE9ic2VydmVNdWx0aXBsZXhlcnM6XG4vLyAgIC0gUG9sbGluZ09ic2VydmVEcml2ZXIgY2FjaGVzIHRoZSByZXN1bHRzIG9mIGEgcXVlcnkgYW5kIHJlcnVucyBpdCB3aGVuXG4vLyAgICAgbmVjZXNzYXJ5LlxuLy8gICAtIE9wbG9nT2JzZXJ2ZURyaXZlciBmb2xsb3dzIHRoZSBNb25nbyBvcGVyYXRpb24gbG9nIHRvIGRpcmVjdGx5IG9ic2VydmVcbi8vICAgICBkYXRhYmFzZSBjaGFuZ2VzLlxuLy8gQm90aCBpbXBsZW1lbnRhdGlvbnMgZm9sbG93IHRoZSBzYW1lIHNpbXBsZSBpbnRlcmZhY2U6IHdoZW4geW91IGNyZWF0ZSB0aGVtLFxuLy8gdGhleSBzdGFydCBzZW5kaW5nIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrcyAoYW5kIGEgcmVhZHkoKSBpbnZvY2F0aW9uKSB0b1xuLy8gdGhlaXIgT2JzZXJ2ZU11bHRpcGxleGVyLCBhbmQgeW91IHN0b3AgdGhlbSBieSBjYWxsaW5nIHRoZWlyIHN0b3AoKSBtZXRob2QuXG5cbkN1cnNvckRlc2NyaXB0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuY29sbGVjdGlvbk5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgc2VsZi5zZWxlY3RvciA9IE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3Rvcik7XG4gIHNlbGYub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG59O1xuXG5DdXJzb3IgPSBmdW5jdGlvbiAobW9uZ28sIGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzZWxmLl9tb25nbyA9IG1vbmdvO1xuICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiA9IGN1cnNvckRlc2NyaXB0aW9uO1xuICBzZWxmLl9zeW5jaHJvbm91c0N1cnNvciA9IG51bGw7XG59O1xuXG5fLmVhY2goWydmb3JFYWNoJywgJ21hcCcsICdmZXRjaCcsICdjb3VudCddLCBmdW5jdGlvbiAobWV0aG9kKSB7XG4gIEN1cnNvci5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBZb3UgY2FuIG9ubHkgb2JzZXJ2ZSBhIHRhaWxhYmxlIGN1cnNvci5cbiAgICBpZiAoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50YWlsYWJsZSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBjYWxsIFwiICsgbWV0aG9kICsgXCIgb24gYSB0YWlsYWJsZSBjdXJzb3JcIik7XG5cbiAgICBpZiAoIXNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yKSB7XG4gICAgICBzZWxmLl9zeW5jaHJvbm91c0N1cnNvciA9IHNlbGYuX21vbmdvLl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvcihcbiAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIHtcbiAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgXCJzZWxmXCIgYXJndW1lbnQgdG8gZm9yRWFjaC9tYXAgY2FsbGJhY2tzIGlzIHRoZVxuICAgICAgICAgIC8vIEN1cnNvciwgbm90IHRoZSBTeW5jaHJvbm91c0N1cnNvci5cbiAgICAgICAgICBzZWxmRm9ySXRlcmF0aW9uOiBzZWxmLFxuICAgICAgICAgIHVzZVRyYW5zZm9ybTogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VsZi5fc3luY2hyb25vdXNDdXJzb3JbbWV0aG9kXS5hcHBseShcbiAgICAgIHNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yLCBhcmd1bWVudHMpO1xuICB9O1xufSk7XG5cbi8vIFNpbmNlIHdlIGRvbid0IGFjdHVhbGx5IGhhdmUgYSBcIm5leHRPYmplY3RcIiBpbnRlcmZhY2UsIHRoZXJlJ3MgcmVhbGx5IG5vXG4vLyByZWFzb24gdG8gaGF2ZSBhIFwicmV3aW5kXCIgaW50ZXJmYWNlLiAgQWxsIGl0IGRpZCB3YXMgbWFrZSBtdWx0aXBsZSBjYWxsc1xuLy8gdG8gZmV0Y2gvbWFwL2ZvckVhY2ggcmV0dXJuIG5vdGhpbmcgdGhlIHNlY29uZCB0aW1lLlxuLy8gWFhYIENPTVBBVCBXSVRIIDAuOC4xXG5DdXJzb3IucHJvdG90eXBlLnJld2luZCA9IGZ1bmN0aW9uICgpIHtcbn07XG5cbkN1cnNvci5wcm90b3R5cGUuZ2V0VHJhbnNmb3JtID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50cmFuc2Zvcm07XG59O1xuXG4vLyBXaGVuIHlvdSBjYWxsIE1ldGVvci5wdWJsaXNoKCkgd2l0aCBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIEN1cnNvciwgd2UgbmVlZFxuLy8gdG8gdHJhbnNtdXRlIGl0IGludG8gdGhlIGVxdWl2YWxlbnQgc3Vic2NyaXB0aW9uLiAgVGhpcyBpcyB0aGUgZnVuY3Rpb24gdGhhdFxuLy8gZG9lcyB0aGF0LlxuXG5DdXJzb3IucHJvdG90eXBlLl9wdWJsaXNoQ3Vyc29yID0gZnVuY3Rpb24gKHN1Yikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWU7XG4gIHJldHVybiBNb25nby5Db2xsZWN0aW9uLl9wdWJsaXNoQ3Vyc29yKHNlbGYsIHN1YiwgY29sbGVjdGlvbik7XG59O1xuXG4vLyBVc2VkIHRvIGd1YXJhbnRlZSB0aGF0IHB1Ymxpc2ggZnVuY3Rpb25zIHJldHVybiBhdCBtb3N0IG9uZSBjdXJzb3IgcGVyXG4vLyBjb2xsZWN0aW9uLiBQcml2YXRlLCBiZWNhdXNlIHdlIG1pZ2h0IGxhdGVyIGhhdmUgY3Vyc29ycyB0aGF0IGluY2x1ZGVcbi8vIGRvY3VtZW50cyBmcm9tIG11bHRpcGxlIGNvbGxlY3Rpb25zIHNvbWVob3cuXG5DdXJzb3IucHJvdG90eXBlLl9nZXRDb2xsZWN0aW9uTmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWU7XG59O1xuXG5DdXJzb3IucHJvdG90eXBlLm9ic2VydmUgPSBmdW5jdGlvbiAoY2FsbGJhY2tzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyhzZWxmLCBjYWxsYmFja3MpO1xufTtcblxuQ3Vyc29yLnByb3RvdHlwZS5vYnNlcnZlQ2hhbmdlcyA9IGZ1bmN0aW9uIChjYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgbWV0aG9kcyA9IFtcbiAgICAnYWRkZWRBdCcsXG4gICAgJ2FkZGVkJyxcbiAgICAnY2hhbmdlZEF0JyxcbiAgICAnY2hhbmdlZCcsXG4gICAgJ3JlbW92ZWRBdCcsXG4gICAgJ3JlbW92ZWQnLFxuICAgICdtb3ZlZFRvJ1xuICBdO1xuICB2YXIgb3JkZXJlZCA9IExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkKGNhbGxiYWNrcyk7XG5cbiAgLy8gWFhYOiBDYW4gd2UgZmluZCBvdXQgaWYgY2FsbGJhY2tzIGFyZSBmcm9tIG9ic2VydmU/XG4gIHZhciBleGNlcHRpb25OYW1lID0gJyBvYnNlcnZlL29ic2VydmVDaGFuZ2VzIGNhbGxiYWNrJzsgXG4gIG1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgaWYgKGNhbGxiYWNrc1ttZXRob2RdICYmIHR5cGVvZiBjYWxsYmFja3NbbWV0aG9kXSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNhbGxiYWNrc1ttZXRob2RdID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChjYWxsYmFja3NbbWV0aG9kXSwgbWV0aG9kICsgZXhjZXB0aW9uTmFtZSk7XG4gICAgfVxuICB9KTtcbiAgXG4gIHJldHVybiBzZWxmLl9tb25nby5fb2JzZXJ2ZUNoYW5nZXMoXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcyk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvciA9IGZ1bmN0aW9uKFxuICAgIGN1cnNvckRlc2NyaXB0aW9uLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgb3B0aW9ucyA9IF8ucGljayhvcHRpb25zIHx8IHt9LCAnc2VsZkZvckl0ZXJhdGlvbicsICd1c2VUcmFuc2Zvcm0nKTtcblxuICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSk7XG4gIHZhciBjdXJzb3JPcHRpb25zID0gY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucztcbiAgdmFyIG1vbmdvT3B0aW9ucyA9IHtcbiAgICBzb3J0OiBjdXJzb3JPcHRpb25zLnNvcnQsXG4gICAgbGltaXQ6IGN1cnNvck9wdGlvbnMubGltaXQsXG4gICAgc2tpcDogY3Vyc29yT3B0aW9ucy5za2lwXG4gIH07XG5cbiAgLy8gRG8gd2Ugd2FudCBhIHRhaWxhYmxlIGN1cnNvciAod2hpY2ggb25seSB3b3JrcyBvbiBjYXBwZWQgY29sbGVjdGlvbnMpP1xuICBpZiAoY3Vyc29yT3B0aW9ucy50YWlsYWJsZSkge1xuICAgIC8vIFdlIHdhbnQgYSB0YWlsYWJsZSBjdXJzb3IuLi5cbiAgICBtb25nb09wdGlvbnMudGFpbGFibGUgPSB0cnVlO1xuICAgIC8vIC4uLiBhbmQgZm9yIHRoZSBzZXJ2ZXIgdG8gd2FpdCBhIGJpdCBpZiBhbnkgZ2V0TW9yZSBoYXMgbm8gZGF0YSAocmF0aGVyXG4gICAgLy8gdGhhbiBtYWtpbmcgdXMgcHV0IHRoZSByZWxldmFudCBzbGVlcHMgaW4gdGhlIGNsaWVudCkuLi5cbiAgICBtb25nb09wdGlvbnMuYXdhaXRkYXRhID0gdHJ1ZTtcbiAgICAvLyAuLi4gYW5kIHRvIGtlZXAgcXVlcnlpbmcgdGhlIHNlcnZlciBpbmRlZmluaXRlbHkgcmF0aGVyIHRoYW4ganVzdCA1IHRpbWVzXG4gICAgLy8gaWYgdGhlcmUncyBubyBtb3JlIGRhdGEuXG4gICAgbW9uZ29PcHRpb25zLm51bWJlck9mUmV0cmllcyA9IC0xO1xuICAgIC8vIEFuZCBpZiB0aGlzIGlzIG9uIHRoZSBvcGxvZyBjb2xsZWN0aW9uIGFuZCB0aGUgY3Vyc29yIHNwZWNpZmllcyBhICd0cycsXG4gICAgLy8gdGhlbiBzZXQgdGhlIHVuZG9jdW1lbnRlZCBvcGxvZyByZXBsYXkgZmxhZywgd2hpY2ggZG9lcyBhIHNwZWNpYWwgc2NhbiB0b1xuICAgIC8vIGZpbmQgdGhlIGZpcnN0IGRvY3VtZW50IChpbnN0ZWFkIG9mIGNyZWF0aW5nIGFuIGluZGV4IG9uIHRzKS4gVGhpcyBpcyBhXG4gICAgLy8gdmVyeSBoYXJkLWNvZGVkIE1vbmdvIGZsYWcgd2hpY2ggb25seSB3b3JrcyBvbiB0aGUgb3Bsb2cgY29sbGVjdGlvbiBhbmRcbiAgICAvLyBvbmx5IHdvcmtzIHdpdGggdGhlIHRzIGZpZWxkLlxuICAgIGlmIChjdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSA9PT0gT1BMT0dfQ09MTEVDVElPTiAmJlxuICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvci50cykge1xuICAgICAgbW9uZ29PcHRpb25zLm9wbG9nUmVwbGF5ID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICB2YXIgZGJDdXJzb3IgPSBjb2xsZWN0aW9uLmZpbmQoXG4gICAgcmVwbGFjZVR5cGVzKGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgY3Vyc29yT3B0aW9ucy5maWVsZHMsIG1vbmdvT3B0aW9ucyk7XG5cbiAgaWYgKHR5cGVvZiBjdXJzb3JPcHRpb25zLm1heFRpbWVNcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBkYkN1cnNvciA9IGRiQ3Vyc29yLm1heFRpbWVNUyhjdXJzb3JPcHRpb25zLm1heFRpbWVNcyk7XG4gIH1cbiAgaWYgKHR5cGVvZiBjdXJzb3JPcHRpb25zLmhpbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZGJDdXJzb3IgPSBkYkN1cnNvci5oaW50KGN1cnNvck9wdGlvbnMuaGludCk7XG4gIH1cblxuICByZXR1cm4gbmV3IFN5bmNocm9ub3VzQ3Vyc29yKGRiQ3Vyc29yLCBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucyk7XG59O1xuXG52YXIgU3luY2hyb25vdXNDdXJzb3IgPSBmdW5jdGlvbiAoZGJDdXJzb3IsIGN1cnNvckRlc2NyaXB0aW9uLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgb3B0aW9ucyA9IF8ucGljayhvcHRpb25zIHx8IHt9LCAnc2VsZkZvckl0ZXJhdGlvbicsICd1c2VUcmFuc2Zvcm0nKTtcblxuICBzZWxmLl9kYkN1cnNvciA9IGRiQ3Vyc29yO1xuICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiA9IGN1cnNvckRlc2NyaXB0aW9uO1xuICAvLyBUaGUgXCJzZWxmXCIgYXJndW1lbnQgcGFzc2VkIHRvIGZvckVhY2gvbWFwIGNhbGxiYWNrcy4gSWYgd2UncmUgd3JhcHBlZFxuICAvLyBpbnNpZGUgYSB1c2VyLXZpc2libGUgQ3Vyc29yLCB3ZSB3YW50IHRvIHByb3ZpZGUgdGhlIG91dGVyIGN1cnNvciFcbiAgc2VsZi5fc2VsZkZvckl0ZXJhdGlvbiA9IG9wdGlvbnMuc2VsZkZvckl0ZXJhdGlvbiB8fCBzZWxmO1xuICBpZiAob3B0aW9ucy51c2VUcmFuc2Zvcm0gJiYgY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50cmFuc2Zvcm0pIHtcbiAgICBzZWxmLl90cmFuc2Zvcm0gPSBMb2NhbENvbGxlY3Rpb24ud3JhcFRyYW5zZm9ybShcbiAgICAgIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudHJhbnNmb3JtKTtcbiAgfSBlbHNlIHtcbiAgICBzZWxmLl90cmFuc2Zvcm0gPSBudWxsO1xuICB9XG5cbiAgLy8gTmVlZCB0byBzcGVjaWZ5IHRoYXQgdGhlIGNhbGxiYWNrIGlzIHRoZSBmaXJzdCBhcmd1bWVudCB0byBuZXh0T2JqZWN0LFxuICAvLyBzaW5jZSBvdGhlcndpc2Ugd2hlbiB3ZSB0cnkgdG8gY2FsbCBpdCB3aXRoIG5vIGFyZ3MgdGhlIGRyaXZlciB3aWxsXG4gIC8vIGludGVycHJldCBcInVuZGVmaW5lZFwiIGZpcnN0IGFyZyBhcyBhbiBvcHRpb25zIGhhc2ggYW5kIGNyYXNoLlxuICBzZWxmLl9zeW5jaHJvbm91c05leHRPYmplY3QgPSBGdXR1cmUud3JhcChcbiAgICBkYkN1cnNvci5uZXh0T2JqZWN0LmJpbmQoZGJDdXJzb3IpLCAwKTtcbiAgc2VsZi5fc3luY2hyb25vdXNDb3VudCA9IEZ1dHVyZS53cmFwKGRiQ3Vyc29yLmNvdW50LmJpbmQoZGJDdXJzb3IpKTtcbiAgc2VsZi5fdmlzaXRlZElkcyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xufTtcblxuXy5leHRlbmQoU3luY2hyb25vdXNDdXJzb3IucHJvdG90eXBlLCB7XG4gIF9uZXh0T2JqZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciBkb2MgPSBzZWxmLl9zeW5jaHJvbm91c05leHRPYmplY3QoKS53YWl0KCk7XG5cbiAgICAgIGlmICghZG9jKSByZXR1cm4gbnVsbDtcbiAgICAgIGRvYyA9IHJlcGxhY2VUeXBlcyhkb2MsIHJlcGxhY2VNb25nb0F0b21XaXRoTWV0ZW9yKTtcblxuICAgICAgaWYgKCFzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlICYmIF8uaGFzKGRvYywgJ19pZCcpKSB7XG4gICAgICAgIC8vIERpZCBNb25nbyBnaXZlIHVzIGR1cGxpY2F0ZSBkb2N1bWVudHMgaW4gdGhlIHNhbWUgY3Vyc29yPyBJZiBzbyxcbiAgICAgICAgLy8gaWdub3JlIHRoaXMgb25lLiAoRG8gdGhpcyBiZWZvcmUgdGhlIHRyYW5zZm9ybSwgc2luY2UgdHJhbnNmb3JtIG1pZ2h0XG4gICAgICAgIC8vIHJldHVybiBzb21lIHVucmVsYXRlZCB2YWx1ZS4pIFdlIGRvbid0IGRvIHRoaXMgZm9yIHRhaWxhYmxlIGN1cnNvcnMsXG4gICAgICAgIC8vIGJlY2F1c2Ugd2Ugd2FudCB0byBtYWludGFpbiBPKDEpIG1lbW9yeSB1c2FnZS4gQW5kIGlmIHRoZXJlIGlzbid0IF9pZFxuICAgICAgICAvLyBmb3Igc29tZSByZWFzb24gKG1heWJlIGl0J3MgdGhlIG9wbG9nKSwgdGhlbiB3ZSBkb24ndCBkbyB0aGlzIGVpdGhlci5cbiAgICAgICAgLy8gKEJlIGNhcmVmdWwgdG8gZG8gdGhpcyBmb3IgZmFsc2V5IGJ1dCBleGlzdGluZyBfaWQsIHRob3VnaC4pXG4gICAgICAgIGlmIChzZWxmLl92aXNpdGVkSWRzLmhhcyhkb2MuX2lkKSkgY29udGludWU7XG4gICAgICAgIHNlbGYuX3Zpc2l0ZWRJZHMuc2V0KGRvYy5faWQsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VsZi5fdHJhbnNmb3JtKVxuICAgICAgICBkb2MgPSBzZWxmLl90cmFuc2Zvcm0oZG9jKTtcblxuICAgICAgcmV0dXJuIGRvYztcbiAgICB9XG4gIH0sXG5cbiAgZm9yRWFjaDogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gR2V0IGJhY2sgdG8gdGhlIGJlZ2lubmluZy5cbiAgICBzZWxmLl9yZXdpbmQoKTtcblxuICAgIC8vIFdlIGltcGxlbWVudCB0aGUgbG9vcCBvdXJzZWxmIGluc3RlYWQgb2YgdXNpbmcgc2VsZi5fZGJDdXJzb3IuZWFjaCxcbiAgICAvLyBiZWNhdXNlIFwiZWFjaFwiIHdpbGwgY2FsbCBpdHMgY2FsbGJhY2sgb3V0c2lkZSBvZiBhIGZpYmVyIHdoaWNoIG1ha2VzIGl0XG4gICAgLy8gbXVjaCBtb3JlIGNvbXBsZXggdG8gbWFrZSB0aGlzIGZ1bmN0aW9uIHN5bmNocm9ub3VzLlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciBkb2MgPSBzZWxmLl9uZXh0T2JqZWN0KCk7XG4gICAgICBpZiAoIWRvYykgcmV0dXJuO1xuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBkb2MsIGluZGV4KyssIHNlbGYuX3NlbGZGb3JJdGVyYXRpb24pO1xuICAgIH1cbiAgfSxcblxuICAvLyBYWFggQWxsb3cgb3ZlcmxhcHBpbmcgY2FsbGJhY2sgZXhlY3V0aW9ucyBpZiBjYWxsYmFjayB5aWVsZHMuXG4gIG1hcDogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBzZWxmLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaW5kZXgpIHtcbiAgICAgIHJlcy5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZG9jLCBpbmRleCwgc2VsZi5fc2VsZkZvckl0ZXJhdGlvbikpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG4gIH0sXG5cbiAgX3Jld2luZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIGtub3duIHRvIGJlIHN5bmNocm9ub3VzXG4gICAgc2VsZi5fZGJDdXJzb3IucmV3aW5kKCk7XG5cbiAgICBzZWxmLl92aXNpdGVkSWRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH0sXG5cbiAgLy8gTW9zdGx5IHVzYWJsZSBmb3IgdGFpbGFibGUgY3Vyc29ycy5cbiAgY2xvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZWxmLl9kYkN1cnNvci5jbG9zZSgpO1xuICB9LFxuXG4gIGZldGNoOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLm1hcChfLmlkZW50aXR5KTtcbiAgfSxcblxuICBjb3VudDogZnVuY3Rpb24gKGFwcGx5U2tpcExpbWl0ID0gZmFsc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHNlbGYuX3N5bmNocm9ub3VzQ291bnQoYXBwbHlTa2lwTGltaXQpLndhaXQoKTtcbiAgfSxcblxuICAvLyBUaGlzIG1ldGhvZCBpcyBOT1Qgd3JhcHBlZCBpbiBDdXJzb3IuXG4gIGdldFJhd09iamVjdHM6IGZ1bmN0aW9uIChvcmRlcmVkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICByZXR1cm4gc2VsZi5mZXRjaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVzdWx0cyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgICAgc2VsZi5mb3JFYWNoKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuICB9XG59KTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS50YWlsID0gZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCBkb2NDYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50YWlsYWJsZSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSB0YWlsIGEgdGFpbGFibGUgY3Vyc29yXCIpO1xuXG4gIHZhciBjdXJzb3IgPSBzZWxmLl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvcihjdXJzb3JEZXNjcmlwdGlvbik7XG5cbiAgdmFyIHN0b3BwZWQgPSBmYWxzZTtcbiAgdmFyIGxhc3RUUztcbiAgdmFyIGxvb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRvYyA9IG51bGw7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChzdG9wcGVkKVxuICAgICAgICByZXR1cm47XG4gICAgICB0cnkge1xuICAgICAgICBkb2MgPSBjdXJzb3IuX25leHRPYmplY3QoKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBUaGVyZSdzIG5vIGdvb2Qgd2F5IHRvIGZpZ3VyZSBvdXQgaWYgdGhpcyB3YXMgYWN0dWFsbHkgYW4gZXJyb3JcbiAgICAgICAgLy8gZnJvbSBNb25nby4gQWggd2VsbC4gQnV0IGVpdGhlciB3YXksIHdlIG5lZWQgdG8gcmV0cnkgdGhlIGN1cnNvclxuICAgICAgICAvLyAodW5sZXNzIHRoZSBmYWlsdXJlIHdhcyBiZWNhdXNlIHRoZSBvYnNlcnZlIGdvdCBzdG9wcGVkKS5cbiAgICAgICAgZG9jID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIFNpbmNlIGN1cnNvci5fbmV4dE9iamVjdCBjYW4geWllbGQsIHdlIG5lZWQgdG8gY2hlY2sgYWdhaW4gdG8gc2VlIGlmXG4gICAgICAvLyB3ZSd2ZSBiZWVuIHN0b3BwZWQgYmVmb3JlIGNhbGxpbmcgdGhlIGNhbGxiYWNrLlxuICAgICAgaWYgKHN0b3BwZWQpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGlmIChkb2MpIHtcbiAgICAgICAgLy8gSWYgYSB0YWlsYWJsZSBjdXJzb3IgY29udGFpbnMgYSBcInRzXCIgZmllbGQsIHVzZSBpdCB0byByZWNyZWF0ZSB0aGVcbiAgICAgICAgLy8gY3Vyc29yIG9uIGVycm9yLiAoXCJ0c1wiIGlzIGEgc3RhbmRhcmQgdGhhdCBNb25nbyB1c2VzIGludGVybmFsbHkgZm9yXG4gICAgICAgIC8vIHRoZSBvcGxvZywgYW5kIHRoZXJlJ3MgYSBzcGVjaWFsIGZsYWcgdGhhdCBsZXRzIHlvdSBkbyBiaW5hcnkgc2VhcmNoXG4gICAgICAgIC8vIG9uIGl0IGluc3RlYWQgb2YgbmVlZGluZyB0byB1c2UgYW4gaW5kZXguKVxuICAgICAgICBsYXN0VFMgPSBkb2MudHM7XG4gICAgICAgIGRvY0NhbGxiYWNrKGRvYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbmV3U2VsZWN0b3IgPSBfLmNsb25lKGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKTtcbiAgICAgICAgaWYgKGxhc3RUUykge1xuICAgICAgICAgIG5ld1NlbGVjdG9yLnRzID0geyRndDogbGFzdFRTfTtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IgPSBzZWxmLl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvcihuZXcgQ3Vyc29yRGVzY3JpcHRpb24oXG4gICAgICAgICAgY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgbmV3U2VsZWN0b3IsXG4gICAgICAgICAgY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucykpO1xuICAgICAgICAvLyBNb25nbyBmYWlsb3ZlciB0YWtlcyBtYW55IHNlY29uZHMuICBSZXRyeSBpbiBhIGJpdC4gIChXaXRob3V0IHRoaXNcbiAgICAgICAgLy8gc2V0VGltZW91dCwgd2UgcGVnIHRoZSBDUFUgYXQgMTAwJSBhbmQgbmV2ZXIgbm90aWNlIHRoZSBhY3R1YWxcbiAgICAgICAgLy8gZmFpbG92ZXIuXG4gICAgICAgIE1ldGVvci5zZXRUaW1lb3V0KGxvb3AsIDEwMCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBNZXRlb3IuZGVmZXIobG9vcCk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICBzdG9wcGVkID0gdHJ1ZTtcbiAgICAgIGN1cnNvci5jbG9zZSgpO1xuICAgIH1cbiAgfTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX29ic2VydmVDaGFuZ2VzID0gZnVuY3Rpb24gKFxuICAgIGN1cnNvckRlc2NyaXB0aW9uLCBvcmRlcmVkLCBjYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlKSB7XG4gICAgcmV0dXJuIHNlbGYuX29ic2VydmVDaGFuZ2VzVGFpbGFibGUoY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcyk7XG4gIH1cblxuICAvLyBZb3UgbWF5IG5vdCBmaWx0ZXIgb3V0IF9pZCB3aGVuIG9ic2VydmluZyBjaGFuZ2VzLCBiZWNhdXNlIHRoZSBpZCBpcyBhIGNvcmVcbiAgLy8gcGFydCBvZiB0aGUgb2JzZXJ2ZUNoYW5nZXMgQVBJLlxuICBpZiAoY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5maWVsZHMgJiZcbiAgICAgIChjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcy5faWQgPT09IDAgfHxcbiAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcy5faWQgPT09IGZhbHNlKSkge1xuICAgIHRocm93IEVycm9yKFwiWW91IG1heSBub3Qgb2JzZXJ2ZSBhIGN1cnNvciB3aXRoIHtmaWVsZHM6IHtfaWQ6IDB9fVwiKTtcbiAgfVxuXG4gIHZhciBvYnNlcnZlS2V5ID0gRUpTT04uc3RyaW5naWZ5KFxuICAgIF8uZXh0ZW5kKHtvcmRlcmVkOiBvcmRlcmVkfSwgY3Vyc29yRGVzY3JpcHRpb24pKTtcblxuICB2YXIgbXVsdGlwbGV4ZXIsIG9ic2VydmVEcml2ZXI7XG4gIHZhciBmaXJzdEhhbmRsZSA9IGZhbHNlO1xuXG4gIC8vIEZpbmQgYSBtYXRjaGluZyBPYnNlcnZlTXVsdGlwbGV4ZXIsIG9yIGNyZWF0ZSBhIG5ldyBvbmUuIFRoaXMgbmV4dCBibG9jayBpc1xuICAvLyBndWFyYW50ZWVkIHRvIG5vdCB5aWVsZCAoYW5kIGl0IGRvZXNuJ3QgY2FsbCBhbnl0aGluZyB0aGF0IGNhbiBvYnNlcnZlIGFcbiAgLy8gbmV3IHF1ZXJ5KSwgc28gbm8gb3RoZXIgY2FsbHMgdG8gdGhpcyBmdW5jdGlvbiBjYW4gaW50ZXJsZWF2ZSB3aXRoIGl0LlxuICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKF8uaGFzKHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnMsIG9ic2VydmVLZXkpKSB7XG4gICAgICBtdWx0aXBsZXhlciA9IHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnNbb2JzZXJ2ZUtleV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpcnN0SGFuZGxlID0gdHJ1ZTtcbiAgICAgIC8vIENyZWF0ZSBhIG5ldyBPYnNlcnZlTXVsdGlwbGV4ZXIuXG4gICAgICBtdWx0aXBsZXhlciA9IG5ldyBPYnNlcnZlTXVsdGlwbGV4ZXIoe1xuICAgICAgICBvcmRlcmVkOiBvcmRlcmVkLFxuICAgICAgICBvblN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBkZWxldGUgc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVyc1tvYnNlcnZlS2V5XTtcbiAgICAgICAgICBvYnNlcnZlRHJpdmVyLnN0b3AoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzW29ic2VydmVLZXldID0gbXVsdGlwbGV4ZXI7XG4gICAgfVxuICB9KTtcblxuICB2YXIgb2JzZXJ2ZUhhbmRsZSA9IG5ldyBPYnNlcnZlSGFuZGxlKG11bHRpcGxleGVyLCBjYWxsYmFja3MpO1xuXG4gIGlmIChmaXJzdEhhbmRsZSkge1xuICAgIHZhciBtYXRjaGVyLCBzb3J0ZXI7XG4gICAgdmFyIGNhblVzZU9wbG9nID0gXy5hbGwoW1xuICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBBdCBhIGJhcmUgbWluaW11bSwgdXNpbmcgdGhlIG9wbG9nIHJlcXVpcmVzIHVzIHRvIGhhdmUgYW4gb3Bsb2csIHRvXG4gICAgICAgIC8vIHdhbnQgdW5vcmRlcmVkIGNhbGxiYWNrcywgYW5kIHRvIG5vdCB3YW50IGEgY2FsbGJhY2sgb24gdGhlIHBvbGxzXG4gICAgICAgIC8vIHRoYXQgd29uJ3QgaGFwcGVuLlxuICAgICAgICByZXR1cm4gc2VsZi5fb3Bsb2dIYW5kbGUgJiYgIW9yZGVyZWQgJiZcbiAgICAgICAgICAhY2FsbGJhY2tzLl90ZXN0T25seVBvbGxDYWxsYmFjaztcbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gV2UgbmVlZCB0byBiZSBhYmxlIHRvIGNvbXBpbGUgdGhlIHNlbGVjdG9yLiBGYWxsIGJhY2sgdG8gcG9sbGluZyBmb3JcbiAgICAgICAgLy8gc29tZSBuZXdmYW5nbGVkICRzZWxlY3RvciB0aGF0IG1pbmltb25nbyBkb2Vzbid0IHN1cHBvcnQgeWV0LlxuICAgICAgICB0cnkge1xuICAgICAgICAgIG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gWFhYIG1ha2UgYWxsIGNvbXBpbGF0aW9uIGVycm9ycyBNaW5pbW9uZ29FcnJvciBvciBzb21ldGhpbmdcbiAgICAgICAgICAvLyAgICAgc28gdGhhdCB0aGlzIGRvZXNuJ3QgaWdub3JlIHVucmVsYXRlZCBleGNlcHRpb25zXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIC4uLiBhbmQgdGhlIHNlbGVjdG9yIGl0c2VsZiBuZWVkcyB0byBzdXBwb3J0IG9wbG9nLlxuICAgICAgICByZXR1cm4gT3Bsb2dPYnNlcnZlRHJpdmVyLmN1cnNvclN1cHBvcnRlZChjdXJzb3JEZXNjcmlwdGlvbiwgbWF0Y2hlcik7XG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIEFuZCB3ZSBuZWVkIHRvIGJlIGFibGUgdG8gY29tcGlsZSB0aGUgc29ydCwgaWYgYW55LiAgZWcsIGNhbid0IGJlXG4gICAgICAgIC8vIHskbmF0dXJhbDogMX0uXG4gICAgICAgIGlmICghY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5zb3J0KVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHNvcnRlciA9IG5ldyBNaW5pbW9uZ28uU29ydGVyKGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuc29ydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IG1hdGNoZXI6IG1hdGNoZXIgfSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBYWFggbWFrZSBhbGwgY29tcGlsYXRpb24gZXJyb3JzIE1pbmltb25nb0Vycm9yIG9yIHNvbWV0aGluZ1xuICAgICAgICAgIC8vICAgICBzbyB0aGF0IHRoaXMgZG9lc24ndCBpZ25vcmUgdW5yZWxhdGVkIGV4Y2VwdGlvbnNcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1dLCBmdW5jdGlvbiAoZikgeyByZXR1cm4gZigpOyB9KTsgIC8vIGludm9rZSBlYWNoIGZ1bmN0aW9uXG5cbiAgICB2YXIgZHJpdmVyQ2xhc3MgPSBjYW5Vc2VPcGxvZyA/IE9wbG9nT2JzZXJ2ZURyaXZlciA6IFBvbGxpbmdPYnNlcnZlRHJpdmVyO1xuICAgIG9ic2VydmVEcml2ZXIgPSBuZXcgZHJpdmVyQ2xhc3Moe1xuICAgICAgY3Vyc29yRGVzY3JpcHRpb246IGN1cnNvckRlc2NyaXB0aW9uLFxuICAgICAgbW9uZ29IYW5kbGU6IHNlbGYsXG4gICAgICBtdWx0aXBsZXhlcjogbXVsdGlwbGV4ZXIsXG4gICAgICBvcmRlcmVkOiBvcmRlcmVkLFxuICAgICAgbWF0Y2hlcjogbWF0Y2hlciwgIC8vIGlnbm9yZWQgYnkgcG9sbGluZ1xuICAgICAgc29ydGVyOiBzb3J0ZXIsICAvLyBpZ25vcmVkIGJ5IHBvbGxpbmdcbiAgICAgIF90ZXN0T25seVBvbGxDYWxsYmFjazogY2FsbGJhY2tzLl90ZXN0T25seVBvbGxDYWxsYmFja1xuICAgIH0pO1xuXG4gICAgLy8gVGhpcyBmaWVsZCBpcyBvbmx5IHNldCBmb3IgdXNlIGluIHRlc3RzLlxuICAgIG11bHRpcGxleGVyLl9vYnNlcnZlRHJpdmVyID0gb2JzZXJ2ZURyaXZlcjtcbiAgfVxuXG4gIC8vIEJsb2NrcyB1bnRpbCB0aGUgaW5pdGlhbCBhZGRzIGhhdmUgYmVlbiBzZW50LlxuICBtdWx0aXBsZXhlci5hZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMob2JzZXJ2ZUhhbmRsZSk7XG5cbiAgcmV0dXJuIG9ic2VydmVIYW5kbGU7XG59O1xuXG4vLyBMaXN0ZW4gZm9yIHRoZSBpbnZhbGlkYXRpb24gbWVzc2FnZXMgdGhhdCB3aWxsIHRyaWdnZXIgdXMgdG8gcG9sbCB0aGVcbi8vIGRhdGFiYXNlIGZvciBjaGFuZ2VzLiBJZiB0aGlzIHNlbGVjdG9yIHNwZWNpZmllcyBzcGVjaWZpYyBJRHMsIHNwZWNpZnkgdGhlbVxuLy8gaGVyZSwgc28gdGhhdCB1cGRhdGVzIHRvIGRpZmZlcmVudCBzcGVjaWZpYyBJRHMgZG9uJ3QgY2F1c2UgdXMgdG8gcG9sbC5cbi8vIGxpc3RlbkNhbGxiYWNrIGlzIHRoZSBzYW1lIGtpbmQgb2YgKG5vdGlmaWNhdGlvbiwgY29tcGxldGUpIGNhbGxiYWNrIHBhc3NlZFxuLy8gdG8gSW52YWxpZGF0aW9uQ3Jvc3NiYXIubGlzdGVuLlxuXG5saXN0ZW5BbGwgPSBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIGxpc3RlbkNhbGxiYWNrKSB7XG4gIHZhciBsaXN0ZW5lcnMgPSBbXTtcbiAgZm9yRWFjaFRyaWdnZXIoY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uICh0cmlnZ2VyKSB7XG4gICAgbGlzdGVuZXJzLnB1c2goRERQU2VydmVyLl9JbnZhbGlkYXRpb25Dcm9zc2Jhci5saXN0ZW4oXG4gICAgICB0cmlnZ2VyLCBsaXN0ZW5DYWxsYmFjaykpO1xuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgIF8uZWFjaChsaXN0ZW5lcnMsIGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICBsaXN0ZW5lci5zdG9wKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59O1xuXG5mb3JFYWNoVHJpZ2dlciA9IGZ1bmN0aW9uIChjdXJzb3JEZXNjcmlwdGlvbiwgdHJpZ2dlckNhbGxiYWNrKSB7XG4gIHZhciBrZXkgPSB7Y29sbGVjdGlvbjogY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWV9O1xuICB2YXIgc3BlY2lmaWNJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKFxuICAgIGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKTtcbiAgaWYgKHNwZWNpZmljSWRzKSB7XG4gICAgXy5lYWNoKHNwZWNpZmljSWRzLCBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHRyaWdnZXJDYWxsYmFjayhfLmV4dGVuZCh7aWQ6IGlkfSwga2V5KSk7XG4gICAgfSk7XG4gICAgdHJpZ2dlckNhbGxiYWNrKF8uZXh0ZW5kKHtkcm9wQ29sbGVjdGlvbjogdHJ1ZSwgaWQ6IG51bGx9LCBrZXkpKTtcbiAgfSBlbHNlIHtcbiAgICB0cmlnZ2VyQ2FsbGJhY2soa2V5KTtcbiAgfVxuICAvLyBFdmVyeW9uZSBjYXJlcyBhYm91dCB0aGUgZGF0YWJhc2UgYmVpbmcgZHJvcHBlZC5cbiAgdHJpZ2dlckNhbGxiYWNrKHsgZHJvcERhdGFiYXNlOiB0cnVlIH0pO1xufTtcblxuLy8gb2JzZXJ2ZUNoYW5nZXMgZm9yIHRhaWxhYmxlIGN1cnNvcnMgb24gY2FwcGVkIGNvbGxlY3Rpb25zLlxuLy9cbi8vIFNvbWUgZGlmZmVyZW5jZXMgZnJvbSBub3JtYWwgY3Vyc29yczpcbi8vICAgLSBXaWxsIG5ldmVyIHByb2R1Y2UgYW55dGhpbmcgb3RoZXIgdGhhbiAnYWRkZWQnIG9yICdhZGRlZEJlZm9yZScuIElmIHlvdVxuLy8gICAgIGRvIHVwZGF0ZSBhIGRvY3VtZW50IHRoYXQgaGFzIGFscmVhZHkgYmVlbiBwcm9kdWNlZCwgdGhpcyB3aWxsIG5vdCBub3RpY2Vcbi8vICAgICBpdC5cbi8vICAgLSBJZiB5b3UgZGlzY29ubmVjdCBhbmQgcmVjb25uZWN0IGZyb20gTW9uZ28sIGl0IHdpbGwgZXNzZW50aWFsbHkgcmVzdGFydFxuLy8gICAgIHRoZSBxdWVyeSwgd2hpY2ggd2lsbCBsZWFkIHRvIGR1cGxpY2F0ZSByZXN1bHRzLiBUaGlzIGlzIHByZXR0eSBiYWQsXG4vLyAgICAgYnV0IGlmIHlvdSBpbmNsdWRlIGEgZmllbGQgY2FsbGVkICd0cycgd2hpY2ggaXMgaW5zZXJ0ZWQgYXNcbi8vICAgICBuZXcgTW9uZ29JbnRlcm5hbHMuTW9uZ29UaW1lc3RhbXAoMCwgMCkgKHdoaWNoIGlzIGluaXRpYWxpemVkIHRvIHRoZVxuLy8gICAgIGN1cnJlbnQgTW9uZ28tc3R5bGUgdGltZXN0YW1wKSwgd2UnbGwgYmUgYWJsZSB0byBmaW5kIHRoZSBwbGFjZSB0b1xuLy8gICAgIHJlc3RhcnQgcHJvcGVybHkuIChUaGlzIGZpZWxkIGlzIHNwZWNpZmljYWxseSB1bmRlcnN0b29kIGJ5IE1vbmdvIHdpdGggYW5cbi8vICAgICBvcHRpbWl6YXRpb24gd2hpY2ggYWxsb3dzIGl0IHRvIGZpbmQgdGhlIHJpZ2h0IHBsYWNlIHRvIHN0YXJ0IHdpdGhvdXRcbi8vICAgICBhbiBpbmRleCBvbiB0cy4gSXQncyBob3cgdGhlIG9wbG9nIHdvcmtzLilcbi8vICAgLSBObyBjYWxsYmFja3MgYXJlIHRyaWdnZXJlZCBzeW5jaHJvbm91c2x5IHdpdGggdGhlIGNhbGwgKHRoZXJlJ3Mgbm9cbi8vICAgICBkaWZmZXJlbnRpYXRpb24gYmV0d2VlbiBcImluaXRpYWwgZGF0YVwiIGFuZCBcImxhdGVyIGNoYW5nZXNcIjsgZXZlcnl0aGluZ1xuLy8gICAgIHRoYXQgbWF0Y2hlcyB0aGUgcXVlcnkgZ2V0cyBzZW50IGFzeW5jaHJvbm91c2x5KS5cbi8vICAgLSBEZS1kdXBsaWNhdGlvbiBpcyBub3QgaW1wbGVtZW50ZWQuXG4vLyAgIC0gRG9lcyBub3QgeWV0IGludGVyYWN0IHdpdGggdGhlIHdyaXRlIGZlbmNlLiBQcm9iYWJseSwgdGhpcyBzaG91bGQgd29yayBieVxuLy8gICAgIGlnbm9yaW5nIHJlbW92ZXMgKHdoaWNoIGRvbid0IHdvcmsgb24gY2FwcGVkIGNvbGxlY3Rpb25zKSBhbmQgdXBkYXRlc1xuLy8gICAgICh3aGljaCBkb24ndCBhZmZlY3QgdGFpbGFibGUgY3Vyc29ycyksIGFuZCBqdXN0IGtlZXBpbmcgdHJhY2sgb2YgdGhlIElEXG4vLyAgICAgb2YgdGhlIGluc2VydGVkIG9iamVjdCwgYW5kIGNsb3NpbmcgdGhlIHdyaXRlIGZlbmNlIG9uY2UgeW91IGdldCB0byB0aGF0XG4vLyAgICAgSUQgKG9yIHRpbWVzdGFtcD8pLiAgVGhpcyBkb2Vzbid0IHdvcmsgd2VsbCBpZiB0aGUgZG9jdW1lbnQgZG9lc24ndCBtYXRjaFxuLy8gICAgIHRoZSBxdWVyeSwgdGhvdWdoLiAgT24gdGhlIG90aGVyIGhhbmQsIHRoZSB3cml0ZSBmZW5jZSBjYW4gY2xvc2Vcbi8vICAgICBpbW1lZGlhdGVseSBpZiBpdCBkb2VzIG5vdCBtYXRjaCB0aGUgcXVlcnkuIFNvIGlmIHdlIHRydXN0IG1pbmltb25nb1xuLy8gICAgIGVub3VnaCB0byBhY2N1cmF0ZWx5IGV2YWx1YXRlIHRoZSBxdWVyeSBhZ2FpbnN0IHRoZSB3cml0ZSBmZW5jZSwgd2Vcbi8vICAgICBzaG91bGQgYmUgYWJsZSB0byBkbyB0aGlzLi4uICBPZiBjb3Vyc2UsIG1pbmltb25nbyBkb2Vzbid0IGV2ZW4gc3VwcG9ydFxuLy8gICAgIE1vbmdvIFRpbWVzdGFtcHMgeWV0LlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fb2JzZXJ2ZUNoYW5nZXNUYWlsYWJsZSA9IGZ1bmN0aW9uIChcbiAgICBjdXJzb3JEZXNjcmlwdGlvbiwgb3JkZXJlZCwgY2FsbGJhY2tzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBUYWlsYWJsZSBjdXJzb3JzIG9ubHkgZXZlciBjYWxsIGFkZGVkL2FkZGVkQmVmb3JlIGNhbGxiYWNrcywgc28gaXQncyBhblxuICAvLyBlcnJvciBpZiB5b3UgZGlkbid0IHByb3ZpZGUgdGhlbS5cbiAgaWYgKChvcmRlcmVkICYmICFjYWxsYmFja3MuYWRkZWRCZWZvcmUpIHx8XG4gICAgICAoIW9yZGVyZWQgJiYgIWNhbGxiYWNrcy5hZGRlZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBvYnNlcnZlIGFuIFwiICsgKG9yZGVyZWQgPyBcIm9yZGVyZWRcIiA6IFwidW5vcmRlcmVkXCIpXG4gICAgICAgICAgICAgICAgICAgICsgXCIgdGFpbGFibGUgY3Vyc29yIHdpdGhvdXQgYSBcIlxuICAgICAgICAgICAgICAgICAgICArIChvcmRlcmVkID8gXCJhZGRlZEJlZm9yZVwiIDogXCJhZGRlZFwiKSArIFwiIGNhbGxiYWNrXCIpO1xuICB9XG5cbiAgcmV0dXJuIHNlbGYudGFpbChjdXJzb3JEZXNjcmlwdGlvbiwgZnVuY3Rpb24gKGRvYykge1xuICAgIHZhciBpZCA9IGRvYy5faWQ7XG4gICAgZGVsZXRlIGRvYy5faWQ7XG4gICAgLy8gVGhlIHRzIGlzIGFuIGltcGxlbWVudGF0aW9uIGRldGFpbC4gSGlkZSBpdC5cbiAgICBkZWxldGUgZG9jLnRzO1xuICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICBjYWxsYmFja3MuYWRkZWRCZWZvcmUoaWQsIGRvYywgbnVsbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrcy5hZGRlZChpZCwgZG9jKTtcbiAgICB9XG4gIH0pO1xufTtcblxuLy8gWFhYIFdlIHByb2JhYmx5IG5lZWQgdG8gZmluZCBhIGJldHRlciB3YXkgdG8gZXhwb3NlIHRoaXMuIFJpZ2h0IG5vd1xuLy8gaXQncyBvbmx5IHVzZWQgYnkgdGVzdHMsIGJ1dCBpbiBmYWN0IHlvdSBuZWVkIGl0IGluIG5vcm1hbFxuLy8gb3BlcmF0aW9uIHRvIGludGVyYWN0IHdpdGggY2FwcGVkIGNvbGxlY3Rpb25zLlxuTW9uZ29JbnRlcm5hbHMuTW9uZ29UaW1lc3RhbXAgPSBNb25nb0RCLlRpbWVzdGFtcDtcblxuTW9uZ29JbnRlcm5hbHMuQ29ubmVjdGlvbiA9IE1vbmdvQ29ubmVjdGlvbjtcbiIsInZhciBGdXR1cmUgPSBOcG0ucmVxdWlyZSgnZmliZXJzL2Z1dHVyZScpO1xuXG5PUExPR19DT0xMRUNUSU9OID0gJ29wbG9nLnJzJztcblxudmFyIFRPT19GQVJfQkVISU5EID0gcHJvY2Vzcy5lbnYuTUVURU9SX09QTE9HX1RPT19GQVJfQkVISU5EIHx8IDIwMDA7XG5cbnZhciBzaG93VFMgPSBmdW5jdGlvbiAodHMpIHtcbiAgcmV0dXJuIFwiVGltZXN0YW1wKFwiICsgdHMuZ2V0SGlnaEJpdHMoKSArIFwiLCBcIiArIHRzLmdldExvd0JpdHMoKSArIFwiKVwiO1xufTtcblxuaWRGb3JPcCA9IGZ1bmN0aW9uIChvcCkge1xuICBpZiAob3Aub3AgPT09ICdkJylcbiAgICByZXR1cm4gb3Auby5faWQ7XG4gIGVsc2UgaWYgKG9wLm9wID09PSAnaScpXG4gICAgcmV0dXJuIG9wLm8uX2lkO1xuICBlbHNlIGlmIChvcC5vcCA9PT0gJ3UnKVxuICAgIHJldHVybiBvcC5vMi5faWQ7XG4gIGVsc2UgaWYgKG9wLm9wID09PSAnYycpXG4gICAgdGhyb3cgRXJyb3IoXCJPcGVyYXRvciAnYycgZG9lc24ndCBzdXBwbHkgYW4gb2JqZWN0IHdpdGggaWQ6IFwiICtcbiAgICAgICAgICAgICAgICBFSlNPTi5zdHJpbmdpZnkob3ApKTtcbiAgZWxzZVxuICAgIHRocm93IEVycm9yKFwiVW5rbm93biBvcDogXCIgKyBFSlNPTi5zdHJpbmdpZnkob3ApKTtcbn07XG5cbk9wbG9nSGFuZGxlID0gZnVuY3Rpb24gKG9wbG9nVXJsLCBkYk5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLl9vcGxvZ1VybCA9IG9wbG9nVXJsO1xuICBzZWxmLl9kYk5hbWUgPSBkYk5hbWU7XG5cbiAgc2VsZi5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uID0gbnVsbDtcbiAgc2VsZi5fb3Bsb2dUYWlsQ29ubmVjdGlvbiA9IG51bGw7XG4gIHNlbGYuX3N0b3BwZWQgPSBmYWxzZTtcbiAgc2VsZi5fdGFpbEhhbmRsZSA9IG51bGw7XG4gIHNlbGYuX3JlYWR5RnV0dXJlID0gbmV3IEZ1dHVyZSgpO1xuICBzZWxmLl9jcm9zc2JhciA9IG5ldyBERFBTZXJ2ZXIuX0Nyb3NzYmFyKHtcbiAgICBmYWN0UGFja2FnZTogXCJtb25nby1saXZlZGF0YVwiLCBmYWN0TmFtZTogXCJvcGxvZy13YXRjaGVyc1wiXG4gIH0pO1xuICBzZWxmLl9iYXNlT3Bsb2dTZWxlY3RvciA9IHtcbiAgICBuczogbmV3IFJlZ0V4cCgnXicgKyBNZXRlb3IuX2VzY2FwZVJlZ0V4cChzZWxmLl9kYk5hbWUpICsgJ1xcXFwuJyksXG4gICAgJG9yOiBbXG4gICAgICB7IG9wOiB7JGluOiBbJ2knLCAndScsICdkJ119IH0sXG4gICAgICAvLyBkcm9wIGNvbGxlY3Rpb25cbiAgICAgIHsgb3A6ICdjJywgJ28uZHJvcCc6IHsgJGV4aXN0czogdHJ1ZSB9IH0sXG4gICAgICB7IG9wOiAnYycsICdvLmRyb3BEYXRhYmFzZSc6IDEgfSxcbiAgICBdXG4gIH07XG5cbiAgLy8gRGF0YSBzdHJ1Y3R1cmVzIHRvIHN1cHBvcnQgd2FpdFVudGlsQ2F1Z2h0VXAoKS4gRWFjaCBvcGxvZyBlbnRyeSBoYXMgYVxuICAvLyBNb25nb1RpbWVzdGFtcCBvYmplY3Qgb24gaXQgKHdoaWNoIGlzIG5vdCB0aGUgc2FtZSBhcyBhIERhdGUgLS0tIGl0J3MgYVxuICAvLyBjb21iaW5hdGlvbiBvZiB0aW1lIGFuZCBhbiBpbmNyZW1lbnRpbmcgY291bnRlcjsgc2VlXG4gIC8vIGh0dHA6Ly9kb2NzLm1vbmdvZGIub3JnL21hbnVhbC9yZWZlcmVuY2UvYnNvbi10eXBlcy8jdGltZXN0YW1wcykuXG4gIC8vXG4gIC8vIF9jYXRjaGluZ1VwRnV0dXJlcyBpcyBhbiBhcnJheSBvZiB7dHM6IE1vbmdvVGltZXN0YW1wLCBmdXR1cmU6IEZ1dHVyZX1cbiAgLy8gb2JqZWN0cywgc29ydGVkIGJ5IGFzY2VuZGluZyB0aW1lc3RhbXAuIF9sYXN0UHJvY2Vzc2VkVFMgaXMgdGhlXG4gIC8vIE1vbmdvVGltZXN0YW1wIG9mIHRoZSBsYXN0IG9wbG9nIGVudHJ5IHdlJ3ZlIHByb2Nlc3NlZC5cbiAgLy9cbiAgLy8gRWFjaCB0aW1lIHdlIGNhbGwgd2FpdFVudGlsQ2F1Z2h0VXAsIHdlIHRha2UgYSBwZWVrIGF0IHRoZSBmaW5hbCBvcGxvZ1xuICAvLyBlbnRyeSBpbiB0aGUgZGIuICBJZiB3ZSd2ZSBhbHJlYWR5IHByb2Nlc3NlZCBpdCAoaWUsIGl0IGlzIG5vdCBncmVhdGVyIHRoYW5cbiAgLy8gX2xhc3RQcm9jZXNzZWRUUyksIHdhaXRVbnRpbENhdWdodFVwIGltbWVkaWF0ZWx5IHJldHVybnMuIE90aGVyd2lzZSxcbiAgLy8gd2FpdFVudGlsQ2F1Z2h0VXAgbWFrZXMgYSBuZXcgRnV0dXJlIGFuZCBpbnNlcnRzIGl0IGFsb25nIHdpdGggdGhlIGZpbmFsXG4gIC8vIHRpbWVzdGFtcCBlbnRyeSB0aGF0IGl0IHJlYWQsIGludG8gX2NhdGNoaW5nVXBGdXR1cmVzLiB3YWl0VW50aWxDYXVnaHRVcFxuICAvLyB0aGVuIHdhaXRzIG9uIHRoYXQgZnV0dXJlLCB3aGljaCBpcyByZXNvbHZlZCBvbmNlIF9sYXN0UHJvY2Vzc2VkVFMgaXNcbiAgLy8gaW5jcmVtZW50ZWQgdG8gYmUgcGFzdCBpdHMgdGltZXN0YW1wIGJ5IHRoZSB3b3JrZXIgZmliZXIuXG4gIC8vXG4gIC8vIFhYWCB1c2UgYSBwcmlvcml0eSBxdWV1ZSBvciBzb21ldGhpbmcgZWxzZSB0aGF0J3MgZmFzdGVyIHRoYW4gYW4gYXJyYXlcbiAgc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMgPSBbXTtcbiAgc2VsZi5fbGFzdFByb2Nlc3NlZFRTID0gbnVsbDtcblxuICBzZWxmLl9vblNraXBwZWRFbnRyaWVzSG9vayA9IG5ldyBIb29rKHtcbiAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvblNraXBwZWRFbnRyaWVzIGNhbGxiYWNrXCJcbiAgfSk7XG5cbiAgc2VsZi5fZW50cnlRdWV1ZSA9IG5ldyBNZXRlb3IuX0RvdWJsZUVuZGVkUXVldWUoKTtcbiAgc2VsZi5fd29ya2VyQWN0aXZlID0gZmFsc2U7XG5cbiAgc2VsZi5fc3RhcnRUYWlsaW5nKCk7XG59O1xuXG5fLmV4dGVuZChPcGxvZ0hhbmRsZS5wcm90b3R5cGUsIHtcbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgICBpZiAoc2VsZi5fdGFpbEhhbmRsZSlcbiAgICAgIHNlbGYuX3RhaWxIYW5kbGUuc3RvcCgpO1xuICAgIC8vIFhYWCBzaG91bGQgY2xvc2UgY29ubmVjdGlvbnMgdG9vXG4gIH0sXG4gIG9uT3Bsb2dFbnRyeTogZnVuY3Rpb24gKHRyaWdnZXIsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIG9uT3Bsb2dFbnRyeSBvbiBzdG9wcGVkIGhhbmRsZSFcIik7XG5cbiAgICAvLyBDYWxsaW5nIG9uT3Bsb2dFbnRyeSByZXF1aXJlcyB1cyB0byB3YWl0IGZvciB0aGUgdGFpbGluZyB0byBiZSByZWFkeS5cbiAgICBzZWxmLl9yZWFkeUZ1dHVyZS53YWl0KCk7XG5cbiAgICB2YXIgb3JpZ2luYWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGNhbGxiYWNrID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbiAobm90aWZpY2F0aW9uKSB7XG4gICAgICAvLyBYWFggY2FuIHdlIGF2b2lkIHRoaXMgY2xvbmUgYnkgbWFraW5nIG9wbG9nLmpzIGNhcmVmdWw/XG4gICAgICBvcmlnaW5hbENhbGxiYWNrKEVKU09OLmNsb25lKG5vdGlmaWNhdGlvbikpO1xuICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIE1ldGVvci5fZGVidWcoXCJFcnJvciBpbiBvcGxvZyBjYWxsYmFja1wiLCBlcnIuc3RhY2spO1xuICAgIH0pO1xuICAgIHZhciBsaXN0ZW5IYW5kbGUgPSBzZWxmLl9jcm9zc2Jhci5saXN0ZW4odHJpZ2dlciwgY2FsbGJhY2spO1xuICAgIHJldHVybiB7XG4gICAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxpc3RlbkhhbmRsZS5zdG9wKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcbiAgLy8gUmVnaXN0ZXIgYSBjYWxsYmFjayB0byBiZSBpbnZva2VkIGFueSB0aW1lIHdlIHNraXAgb3Bsb2cgZW50cmllcyAoZWcsXG4gIC8vIGJlY2F1c2Ugd2UgYXJlIHRvbyBmYXIgYmVoaW5kKS5cbiAgb25Ta2lwcGVkRW50cmllczogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIG9uU2tpcHBlZEVudHJpZXMgb24gc3RvcHBlZCBoYW5kbGUhXCIpO1xuICAgIHJldHVybiBzZWxmLl9vblNraXBwZWRFbnRyaWVzSG9vay5yZWdpc3RlcihjYWxsYmFjayk7XG4gIH0sXG4gIC8vIENhbGxzIGBjYWxsYmFja2Agb25jZSB0aGUgb3Bsb2cgaGFzIGJlZW4gcHJvY2Vzc2VkIHVwIHRvIGEgcG9pbnQgdGhhdCBpc1xuICAvLyByb3VnaGx5IFwibm93XCI6IHNwZWNpZmljYWxseSwgb25jZSB3ZSd2ZSBwcm9jZXNzZWQgYWxsIG9wcyB0aGF0IGFyZVxuICAvLyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgLy8gWFhYIGJlY29tZSBjb252aW5jZWQgdGhhdCB0aGlzIGlzIGFjdHVhbGx5IHNhZmUgZXZlbiBpZiBvcGxvZ0Nvbm5lY3Rpb25cbiAgLy8gaXMgc29tZSBraW5kIG9mIHBvb2xcbiAgd2FpdFVudGlsQ2F1Z2h0VXA6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsZWQgd2FpdFVudGlsQ2F1Z2h0VXAgb24gc3RvcHBlZCBoYW5kbGUhXCIpO1xuXG4gICAgLy8gQ2FsbGluZyB3YWl0VW50aWxDYXVnaHRVcCByZXF1cmllcyB1cyB0byB3YWl0IGZvciB0aGUgb3Bsb2cgY29ubmVjdGlvbiB0b1xuICAgIC8vIGJlIHJlYWR5LlxuICAgIHNlbGYuX3JlYWR5RnV0dXJlLndhaXQoKTtcbiAgICB2YXIgbGFzdEVudHJ5O1xuXG4gICAgd2hpbGUgKCFzZWxmLl9zdG9wcGVkKSB7XG4gICAgICAvLyBXZSBuZWVkIHRvIG1ha2UgdGhlIHNlbGVjdG9yIGF0IGxlYXN0IGFzIHJlc3RyaWN0aXZlIGFzIHRoZSBhY3R1YWxcbiAgICAgIC8vIHRhaWxpbmcgc2VsZWN0b3IgKGllLCB3ZSBuZWVkIHRvIHNwZWNpZnkgdGhlIERCIG5hbWUpIG9yIGVsc2Ugd2UgbWlnaHRcbiAgICAgIC8vIGZpbmQgYSBUUyB0aGF0IHdvbid0IHNob3cgdXAgaW4gdGhlIGFjdHVhbCB0YWlsIHN0cmVhbS5cbiAgICAgIHRyeSB7XG4gICAgICAgIGxhc3RFbnRyeSA9IHNlbGYuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbi5maW5kT25lKFxuICAgICAgICAgIE9QTE9HX0NPTExFQ1RJT04sIHNlbGYuX2Jhc2VPcGxvZ1NlbGVjdG9yLFxuICAgICAgICAgIHtmaWVsZHM6IHt0czogMX0sIHNvcnQ6IHskbmF0dXJhbDogLTF9fSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBEdXJpbmcgZmFpbG92ZXIgKGVnKSBpZiB3ZSBnZXQgYW4gZXhjZXB0aW9uIHdlIHNob3VsZCBsb2cgYW5kIHJldHJ5XG4gICAgICAgIC8vIGluc3RlYWQgb2YgY3Jhc2hpbmcuXG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIHJlYWRpbmcgbGFzdCBlbnRyeTogXCIgKyBlKTtcbiAgICAgICAgTWV0ZW9yLl9zbGVlcEZvck1zKDEwMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG5cbiAgICBpZiAoIWxhc3RFbnRyeSkge1xuICAgICAgLy8gUmVhbGx5LCBub3RoaW5nIGluIHRoZSBvcGxvZz8gV2VsbCwgd2UndmUgcHJvY2Vzc2VkIGV2ZXJ5dGhpbmcuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHRzID0gbGFzdEVudHJ5LnRzO1xuICAgIGlmICghdHMpXG4gICAgICB0aHJvdyBFcnJvcihcIm9wbG9nIGVudHJ5IHdpdGhvdXQgdHM6IFwiICsgRUpTT04uc3RyaW5naWZ5KGxhc3RFbnRyeSkpO1xuXG4gICAgaWYgKHNlbGYuX2xhc3RQcm9jZXNzZWRUUyAmJiB0cy5sZXNzVGhhbk9yRXF1YWwoc2VsZi5fbGFzdFByb2Nlc3NlZFRTKSkge1xuICAgICAgLy8gV2UndmUgYWxyZWFkeSBjYXVnaHQgdXAgdG8gaGVyZS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cblxuICAgIC8vIEluc2VydCB0aGUgZnV0dXJlIGludG8gb3VyIGxpc3QuIEFsbW9zdCBhbHdheXMsIHRoaXMgd2lsbCBiZSBhdCB0aGUgZW5kLFxuICAgIC8vIGJ1dCBpdCdzIGNvbmNlaXZhYmxlIHRoYXQgaWYgd2UgZmFpbCBvdmVyIGZyb20gb25lIHByaW1hcnkgdG8gYW5vdGhlcixcbiAgICAvLyB0aGUgb3Bsb2cgZW50cmllcyB3ZSBzZWUgd2lsbCBnbyBiYWNrd2FyZHMuXG4gICAgdmFyIGluc2VydEFmdGVyID0gc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMubGVuZ3RoO1xuICAgIHdoaWxlIChpbnNlcnRBZnRlciAtIDEgPiAwICYmIHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzW2luc2VydEFmdGVyIC0gMV0udHMuZ3JlYXRlclRoYW4odHMpKSB7XG4gICAgICBpbnNlcnRBZnRlci0tO1xuICAgIH1cbiAgICB2YXIgZiA9IG5ldyBGdXR1cmU7XG4gICAgc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMuc3BsaWNlKGluc2VydEFmdGVyLCAwLCB7dHM6IHRzLCBmdXR1cmU6IGZ9KTtcbiAgICBmLndhaXQoKTtcbiAgfSxcbiAgX3N0YXJ0VGFpbGluZzogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBGaXJzdCwgbWFrZSBzdXJlIHRoYXQgd2UncmUgdGFsa2luZyB0byB0aGUgbG9jYWwgZGF0YWJhc2UuXG4gICAgdmFyIG1vbmdvZGJVcmkgPSBOcG0ucmVxdWlyZSgnbW9uZ29kYi11cmknKTtcbiAgICBpZiAobW9uZ29kYlVyaS5wYXJzZShzZWxmLl9vcGxvZ1VybCkuZGF0YWJhc2UgIT09ICdsb2NhbCcpIHtcbiAgICAgIHRocm93IEVycm9yKFwiJE1PTkdPX09QTE9HX1VSTCBtdXN0IGJlIHNldCB0byB0aGUgJ2xvY2FsJyBkYXRhYmFzZSBvZiBcIiArXG4gICAgICAgICAgICAgICAgICBcImEgTW9uZ28gcmVwbGljYSBzZXRcIik7XG4gICAgfVxuXG4gICAgLy8gV2UgbWFrZSB0d28gc2VwYXJhdGUgY29ubmVjdGlvbnMgdG8gTW9uZ28uIFRoZSBOb2RlIE1vbmdvIGRyaXZlclxuICAgIC8vIGltcGxlbWVudHMgYSBuYWl2ZSByb3VuZC1yb2JpbiBjb25uZWN0aW9uIHBvb2w6IGVhY2ggXCJjb25uZWN0aW9uXCIgaXMgYVxuICAgIC8vIHBvb2wgb2Ygc2V2ZXJhbCAoNSBieSBkZWZhdWx0KSBUQ1AgY29ubmVjdGlvbnMsIGFuZCBlYWNoIHJlcXVlc3QgaXNcbiAgICAvLyByb3RhdGVkIHRocm91Z2ggdGhlIHBvb2xzLiBUYWlsYWJsZSBjdXJzb3IgcXVlcmllcyBibG9jayBvbiB0aGUgc2VydmVyXG4gICAgLy8gdW50aWwgdGhlcmUgaXMgc29tZSBkYXRhIHRvIHJldHVybiAob3IgdW50aWwgYSBmZXcgc2Vjb25kcyBoYXZlXG4gICAgLy8gcGFzc2VkKS4gU28gaWYgdGhlIGNvbm5lY3Rpb24gcG9vbCB1c2VkIGZvciB0YWlsaW5nIGN1cnNvcnMgaXMgdGhlIHNhbWVcbiAgICAvLyBwb29sIHVzZWQgZm9yIG90aGVyIHF1ZXJpZXMsIHRoZSBvdGhlciBxdWVyaWVzIHdpbGwgYmUgZGVsYXllZCBieSBzZWNvbmRzXG4gICAgLy8gMS81IG9mIHRoZSB0aW1lLlxuICAgIC8vXG4gICAgLy8gVGhlIHRhaWwgY29ubmVjdGlvbiB3aWxsIG9ubHkgZXZlciBiZSBydW5uaW5nIGEgc2luZ2xlIHRhaWwgY29tbWFuZCwgc29cbiAgICAvLyBpdCBvbmx5IG5lZWRzIHRvIG1ha2Ugb25lIHVuZGVybHlpbmcgVENQIGNvbm5lY3Rpb24uXG4gICAgc2VsZi5fb3Bsb2dUYWlsQ29ubmVjdGlvbiA9IG5ldyBNb25nb0Nvbm5lY3Rpb24oXG4gICAgICBzZWxmLl9vcGxvZ1VybCwge3Bvb2xTaXplOiAxfSk7XG4gICAgLy8gWFhYIGJldHRlciBkb2NzLCBidXQ6IGl0J3MgdG8gZ2V0IG1vbm90b25pYyByZXN1bHRzXG4gICAgLy8gWFhYIGlzIGl0IHNhZmUgdG8gc2F5IFwiaWYgdGhlcmUncyBhbiBpbiBmbGlnaHQgcXVlcnksIGp1c3QgdXNlIGl0c1xuICAgIC8vICAgICByZXN1bHRzXCI/IEkgZG9uJ3QgdGhpbmsgc28gYnV0IHNob3VsZCBjb25zaWRlciB0aGF0XG4gICAgc2VsZi5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uID0gbmV3IE1vbmdvQ29ubmVjdGlvbihcbiAgICAgIHNlbGYuX29wbG9nVXJsLCB7cG9vbFNpemU6IDF9KTtcblxuICAgIC8vIE5vdywgbWFrZSBzdXJlIHRoYXQgdGhlcmUgYWN0dWFsbHkgaXMgYSByZXBsIHNldCBoZXJlLiBJZiBub3QsIG9wbG9nXG4gICAgLy8gdGFpbGluZyB3b24ndCBldmVyIGZpbmQgYW55dGhpbmchXG4gICAgLy8gTW9yZSBvbiB0aGUgaXNNYXN0ZXJEb2NcbiAgICAvLyBodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9jb21tYW5kL2lzTWFzdGVyL1xuICAgIHZhciBmID0gbmV3IEZ1dHVyZTtcbiAgICBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24uZGIuYWRtaW4oKS5jb21tYW5kKFxuICAgICAgeyBpc21hc3RlcjogMSB9LCBmLnJlc29sdmVyKCkpO1xuICAgIHZhciBpc01hc3RlckRvYyA9IGYud2FpdCgpO1xuXG4gICAgaWYgKCEoaXNNYXN0ZXJEb2MgJiYgaXNNYXN0ZXJEb2Muc2V0TmFtZSkpIHtcbiAgICAgIHRocm93IEVycm9yKFwiJE1PTkdPX09QTE9HX1VSTCBtdXN0IGJlIHNldCB0byB0aGUgJ2xvY2FsJyBkYXRhYmFzZSBvZiBcIiArXG4gICAgICAgICAgICAgICAgICBcImEgTW9uZ28gcmVwbGljYSBzZXRcIik7XG4gICAgfVxuXG4gICAgLy8gRmluZCB0aGUgbGFzdCBvcGxvZyBlbnRyeS5cbiAgICB2YXIgbGFzdE9wbG9nRW50cnkgPSBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24uZmluZE9uZShcbiAgICAgIE9QTE9HX0NPTExFQ1RJT04sIHt9LCB7c29ydDogeyRuYXR1cmFsOiAtMX0sIGZpZWxkczoge3RzOiAxfX0pO1xuXG4gICAgdmFyIG9wbG9nU2VsZWN0b3IgPSBfLmNsb25lKHNlbGYuX2Jhc2VPcGxvZ1NlbGVjdG9yKTtcbiAgICBpZiAobGFzdE9wbG9nRW50cnkpIHtcbiAgICAgIC8vIFN0YXJ0IGFmdGVyIHRoZSBsYXN0IGVudHJ5IHRoYXQgY3VycmVudGx5IGV4aXN0cy5cbiAgICAgIG9wbG9nU2VsZWN0b3IudHMgPSB7JGd0OiBsYXN0T3Bsb2dFbnRyeS50c307XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgYW55IGNhbGxzIHRvIGNhbGxXaGVuUHJvY2Vzc2VkTGF0ZXN0IGJlZm9yZSBhbnkgb3RoZXJcbiAgICAgIC8vIG9wbG9nIGVudHJpZXMgc2hvdyB1cCwgYWxsb3cgY2FsbFdoZW5Qcm9jZXNzZWRMYXRlc3QgdG8gY2FsbCBpdHNcbiAgICAgIC8vIGNhbGxiYWNrIGltbWVkaWF0ZWx5LlxuICAgICAgc2VsZi5fbGFzdFByb2Nlc3NlZFRTID0gbGFzdE9wbG9nRW50cnkudHM7XG4gICAgfVxuXG4gICAgdmFyIGN1cnNvckRlc2NyaXB0aW9uID0gbmV3IEN1cnNvckRlc2NyaXB0aW9uKFxuICAgICAgT1BMT0dfQ09MTEVDVElPTiwgb3Bsb2dTZWxlY3Rvciwge3RhaWxhYmxlOiB0cnVlfSk7XG5cbiAgICBzZWxmLl90YWlsSGFuZGxlID0gc2VsZi5fb3Bsb2dUYWlsQ29ubmVjdGlvbi50YWlsKFxuICAgICAgY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgc2VsZi5fZW50cnlRdWV1ZS5wdXNoKGRvYyk7XG4gICAgICAgIHNlbGYuX21heWJlU3RhcnRXb3JrZXIoKTtcbiAgICAgIH1cbiAgICApO1xuICAgIHNlbGYuX3JlYWR5RnV0dXJlLnJldHVybigpO1xuICB9LFxuXG4gIF9tYXliZVN0YXJ0V29ya2VyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl93b3JrZXJBY3RpdmUpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fd29ya2VyQWN0aXZlID0gdHJ1ZTtcbiAgICBNZXRlb3IuZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgd2hpbGUgKCEgc2VsZi5fc3RvcHBlZCAmJiAhIHNlbGYuX2VudHJ5UXVldWUuaXNFbXB0eSgpKSB7XG4gICAgICAgICAgLy8gQXJlIHdlIHRvbyBmYXIgYmVoaW5kPyBKdXN0IHRlbGwgb3VyIG9ic2VydmVycyB0aGF0IHRoZXkgbmVlZCB0b1xuICAgICAgICAgIC8vIHJlcG9sbCwgYW5kIGRyb3Agb3VyIHF1ZXVlLlxuICAgICAgICAgIGlmIChzZWxmLl9lbnRyeVF1ZXVlLmxlbmd0aCA+IFRPT19GQVJfQkVISU5EKSB7XG4gICAgICAgICAgICB2YXIgbGFzdEVudHJ5ID0gc2VsZi5fZW50cnlRdWV1ZS5wb3AoKTtcbiAgICAgICAgICAgIHNlbGYuX2VudHJ5UXVldWUuY2xlYXIoKTtcblxuICAgICAgICAgICAgc2VsZi5fb25Ta2lwcGVkRW50cmllc0hvb2suZWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gRnJlZSBhbnkgd2FpdFVudGlsQ2F1Z2h0VXAoKSBjYWxscyB0aGF0IHdlcmUgd2FpdGluZyBmb3IgdXMgdG9cbiAgICAgICAgICAgIC8vIHBhc3Mgc29tZXRoaW5nIHRoYXQgd2UganVzdCBza2lwcGVkLlxuICAgICAgICAgICAgc2VsZi5fc2V0TGFzdFByb2Nlc3NlZFRTKGxhc3RFbnRyeS50cyk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgZG9jID0gc2VsZi5fZW50cnlRdWV1ZS5zaGlmdCgpO1xuXG4gICAgICAgICAgaWYgKCEoZG9jLm5zICYmIGRvYy5ucy5sZW5ndGggPiBzZWxmLl9kYk5hbWUubGVuZ3RoICsgMSAmJlxuICAgICAgICAgICAgICAgIGRvYy5ucy5zdWJzdHIoMCwgc2VsZi5fZGJOYW1lLmxlbmd0aCArIDEpID09PVxuICAgICAgICAgICAgICAgIChzZWxmLl9kYk5hbWUgKyAnLicpKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5leHBlY3RlZCBuc1wiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgdHJpZ2dlciA9IHtjb2xsZWN0aW9uOiBkb2MubnMuc3Vic3RyKHNlbGYuX2RiTmFtZS5sZW5ndGggKyAxKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBkcm9wQ29sbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZHJvcERhdGFiYXNlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBvcDogZG9jfTtcblxuICAgICAgICAgIC8vIElzIGl0IGEgc3BlY2lhbCBjb21tYW5kIGFuZCB0aGUgY29sbGVjdGlvbiBuYW1lIGlzIGhpZGRlbiBzb21ld2hlcmVcbiAgICAgICAgICAvLyBpbiBvcGVyYXRvcj9cbiAgICAgICAgICBpZiAodHJpZ2dlci5jb2xsZWN0aW9uID09PSBcIiRjbWRcIikge1xuICAgICAgICAgICAgaWYgKGRvYy5vLmRyb3BEYXRhYmFzZSkge1xuICAgICAgICAgICAgICBkZWxldGUgdHJpZ2dlci5jb2xsZWN0aW9uO1xuICAgICAgICAgICAgICB0cmlnZ2VyLmRyb3BEYXRhYmFzZSA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaGFzKGRvYy5vLCAnZHJvcCcpKSB7XG4gICAgICAgICAgICAgIHRyaWdnZXIuY29sbGVjdGlvbiA9IGRvYy5vLmRyb3A7XG4gICAgICAgICAgICAgIHRyaWdnZXIuZHJvcENvbGxlY3Rpb24gPSB0cnVlO1xuICAgICAgICAgICAgICB0cmlnZ2VyLmlkID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IEVycm9yKFwiVW5rbm93biBjb21tYW5kIFwiICsgSlNPTi5zdHJpbmdpZnkoZG9jKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEFsbCBvdGhlciBvcHMgaGF2ZSBhbiBpZC5cbiAgICAgICAgICAgIHRyaWdnZXIuaWQgPSBpZEZvck9wKGRvYyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2VsZi5fY3Jvc3NiYXIuZmlyZSh0cmlnZ2VyKTtcblxuICAgICAgICAgIC8vIE5vdyB0aGF0IHdlJ3ZlIHByb2Nlc3NlZCB0aGlzIG9wZXJhdGlvbiwgcHJvY2VzcyBwZW5kaW5nXG4gICAgICAgICAgLy8gc2VxdWVuY2Vycy5cbiAgICAgICAgICBpZiAoIWRvYy50cylcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwib3Bsb2cgZW50cnkgd2l0aG91dCB0czogXCIgKyBFSlNPTi5zdHJpbmdpZnkoZG9jKSk7XG4gICAgICAgICAgc2VsZi5fc2V0TGFzdFByb2Nlc3NlZFRTKGRvYy50cyk7XG4gICAgICAgIH1cbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIHNlbGYuX3dvcmtlckFjdGl2ZSA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfc2V0TGFzdFByb2Nlc3NlZFRTOiBmdW5jdGlvbiAodHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fbGFzdFByb2Nlc3NlZFRTID0gdHM7XG4gICAgd2hpbGUgKCFfLmlzRW1wdHkoc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMpICYmIHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzWzBdLnRzLmxlc3NUaGFuT3JFcXVhbChzZWxmLl9sYXN0UHJvY2Vzc2VkVFMpKSB7XG4gICAgICB2YXIgc2VxdWVuY2VyID0gc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMuc2hpZnQoKTtcbiAgICAgIHNlcXVlbmNlci5mdXR1cmUucmV0dXJuKCk7XG4gICAgfVxuICB9LFxuXG4gIC8vTWV0aG9kcyB1c2VkIG9uIHRlc3RzIHRvIGRpbmFtaWNhbGx5IGNoYW5nZSBUT09fRkFSX0JFSElORFxuICBfZGVmaW5lVG9vRmFyQmVoaW5kOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIFRPT19GQVJfQkVISU5EID0gdmFsdWU7XG4gIH0sXG4gIF9yZXNldFRvb0ZhckJlaGluZDogZnVuY3Rpb24oKSB7XG4gICAgVE9PX0ZBUl9CRUhJTkQgPSBwcm9jZXNzLmVudi5NRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQgfHwgMjAwMDtcbiAgfVxufSk7XG4iLCJ2YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuT2JzZXJ2ZU11bHRpcGxleGVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghb3B0aW9ucyB8fCAhXy5oYXMob3B0aW9ucywgJ29yZGVyZWQnKSlcbiAgICB0aHJvdyBFcnJvcihcIm11c3Qgc3BlY2lmaWVkIG9yZGVyZWRcIik7XG5cbiAgUGFja2FnZS5mYWN0cyAmJiBQYWNrYWdlLmZhY3RzLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtbXVsdGlwbGV4ZXJzXCIsIDEpO1xuXG4gIHNlbGYuX29yZGVyZWQgPSBvcHRpb25zLm9yZGVyZWQ7XG4gIHNlbGYuX29uU3RvcCA9IG9wdGlvbnMub25TdG9wIHx8IGZ1bmN0aW9uICgpIHt9O1xuICBzZWxmLl9xdWV1ZSA9IG5ldyBNZXRlb3IuX1N5bmNocm9ub3VzUXVldWUoKTtcbiAgc2VsZi5faGFuZGxlcyA9IHt9O1xuICBzZWxmLl9yZWFkeUZ1dHVyZSA9IG5ldyBGdXR1cmU7XG4gIHNlbGYuX2NhY2hlID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fQ2FjaGluZ0NoYW5nZU9ic2VydmVyKHtcbiAgICBvcmRlcmVkOiBvcHRpb25zLm9yZGVyZWR9KTtcbiAgLy8gTnVtYmVyIG9mIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyB0YXNrcyBzY2hlZHVsZWQgYnV0IG5vdCB5ZXRcbiAgLy8gcnVubmluZy4gcmVtb3ZlSGFuZGxlIHVzZXMgdGhpcyB0byBrbm93IGlmIGl0J3MgdGltZSB0byBjYWxsIHRoZSBvblN0b3BcbiAgLy8gY2FsbGJhY2suXG4gIHNlbGYuX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkID0gMDtcblxuICBfLmVhY2goc2VsZi5jYWxsYmFja05hbWVzKCksIGZ1bmN0aW9uIChjYWxsYmFja05hbWUpIHtcbiAgICBzZWxmW2NhbGxiYWNrTmFtZV0gPSBmdW5jdGlvbiAoLyogLi4uICovKSB7XG4gICAgICBzZWxmLl9hcHBseUNhbGxiYWNrKGNhbGxiYWNrTmFtZSwgXy50b0FycmF5KGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH0pO1xufTtcblxuXy5leHRlbmQoT2JzZXJ2ZU11bHRpcGxleGVyLnByb3RvdHlwZSwge1xuICBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHM6IGZ1bmN0aW9uIChoYW5kbGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBDaGVjayB0aGlzIGJlZm9yZSBjYWxsaW5nIHJ1blRhc2sgKGV2ZW4gdGhvdWdoIHJ1blRhc2sgZG9lcyB0aGUgc2FtZVxuICAgIC8vIGNoZWNrKSBzbyB0aGF0IHdlIGRvbid0IGxlYWsgYW4gT2JzZXJ2ZU11bHRpcGxleGVyIG9uIGVycm9yIGJ5XG4gICAgLy8gaW5jcmVtZW50aW5nIF9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZCBhbmQgbmV2ZXJcbiAgICAvLyBkZWNyZW1lbnRpbmcgaXQuXG4gICAgaWYgKCFzZWxmLl9xdWV1ZS5zYWZlVG9SdW5UYXNrKCkpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBjYWxsIG9ic2VydmVDaGFuZ2VzIGZyb20gYW4gb2JzZXJ2ZSBjYWxsYmFjayBvbiB0aGUgc2FtZSBxdWVyeVwiKTtcbiAgICArK3NlbGYuX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkO1xuXG4gICAgUGFja2FnZS5mYWN0cyAmJiBQYWNrYWdlLmZhY3RzLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1oYW5kbGVzXCIsIDEpO1xuXG4gICAgc2VsZi5fcXVldWUucnVuVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9oYW5kbGVzW2hhbmRsZS5faWRdID0gaGFuZGxlO1xuICAgICAgLy8gU2VuZCBvdXQgd2hhdGV2ZXIgYWRkcyB3ZSBoYXZlIHNvIGZhciAod2hldGhlciBvciBub3Qgd2UgdGhlXG4gICAgICAvLyBtdWx0aXBsZXhlciBpcyByZWFkeSkuXG4gICAgICBzZWxmLl9zZW5kQWRkcyhoYW5kbGUpO1xuICAgICAgLS1zZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZDtcbiAgICB9KTtcbiAgICAvLyAqb3V0c2lkZSogdGhlIHRhc2ssIHNpbmNlIG90aGVyd2lzZSB3ZSdkIGRlYWRsb2NrXG4gICAgc2VsZi5fcmVhZHlGdXR1cmUud2FpdCgpO1xuICB9LFxuXG4gIC8vIFJlbW92ZSBhbiBvYnNlcnZlIGhhbmRsZS4gSWYgaXQgd2FzIHRoZSBsYXN0IG9ic2VydmUgaGFuZGxlLCBjYWxsIHRoZVxuICAvLyBvblN0b3AgY2FsbGJhY2s7IHlvdSBjYW5ub3QgYWRkIGFueSBtb3JlIG9ic2VydmUgaGFuZGxlcyBhZnRlciB0aGlzLlxuICAvL1xuICAvLyBUaGlzIGlzIG5vdCBzeW5jaHJvbml6ZWQgd2l0aCBwb2xscyBhbmQgaGFuZGxlIGFkZGl0aW9uczogdGhpcyBtZWFucyB0aGF0XG4gIC8vIHlvdSBjYW4gc2FmZWx5IGNhbGwgaXQgZnJvbSB3aXRoaW4gYW4gb2JzZXJ2ZSBjYWxsYmFjaywgYnV0IGl0IGFsc28gbWVhbnNcbiAgLy8gdGhhdCB3ZSBoYXZlIHRvIGJlIGNhcmVmdWwgd2hlbiB3ZSBpdGVyYXRlIG92ZXIgX2hhbmRsZXMuXG4gIHJlbW92ZUhhbmRsZTogZnVuY3Rpb24gKGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gVGhpcyBzaG91bGQgbm90IGJlIHBvc3NpYmxlOiB5b3UgY2FuIG9ubHkgY2FsbCByZW1vdmVIYW5kbGUgYnkgaGF2aW5nXG4gICAgLy8gYWNjZXNzIHRvIHRoZSBPYnNlcnZlSGFuZGxlLCB3aGljaCBpc24ndCByZXR1cm5lZCB0byB1c2VyIGNvZGUgdW50aWwgdGhlXG4gICAgLy8gbXVsdGlwbGV4IGlzIHJlYWR5LlxuICAgIGlmICghc2VsZi5fcmVhZHkoKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IHJlbW92ZSBoYW5kbGVzIHVudGlsIHRoZSBtdWx0aXBsZXggaXMgcmVhZHlcIik7XG5cbiAgICBkZWxldGUgc2VsZi5faGFuZGxlc1tpZF07XG5cbiAgICBQYWNrYWdlLmZhY3RzICYmIFBhY2thZ2UuZmFjdHMuRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWhhbmRsZXNcIiwgLTEpO1xuXG4gICAgaWYgKF8uaXNFbXB0eShzZWxmLl9oYW5kbGVzKSAmJlxuICAgICAgICBzZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZCA9PT0gMCkge1xuICAgICAgc2VsZi5fc3RvcCgpO1xuICAgIH1cbiAgfSxcbiAgX3N0b3A6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gSXQgc2hvdWxkbid0IGJlIHBvc3NpYmxlIGZvciB1cyB0byBzdG9wIHdoZW4gYWxsIG91ciBoYW5kbGVzIHN0aWxsXG4gICAgLy8gaGF2ZW4ndCBiZWVuIHJldHVybmVkIGZyb20gb2JzZXJ2ZUNoYW5nZXMhXG4gICAgaWYgKCEgc2VsZi5fcmVhZHkoKSAmJiAhIG9wdGlvbnMuZnJvbVF1ZXJ5RXJyb3IpXG4gICAgICB0aHJvdyBFcnJvcihcInN1cnByaXNpbmcgX3N0b3A6IG5vdCByZWFkeVwiKTtcblxuICAgIC8vIENhbGwgc3RvcCBjYWxsYmFjayAod2hpY2gga2lsbHMgdGhlIHVuZGVybHlpbmcgcHJvY2VzcyB3aGljaCBzZW5kcyB1c1xuICAgIC8vIGNhbGxiYWNrcyBhbmQgcmVtb3ZlcyB1cyBmcm9tIHRoZSBjb25uZWN0aW9uJ3MgZGljdGlvbmFyeSkuXG4gICAgc2VsZi5fb25TdG9wKCk7XG4gICAgUGFja2FnZS5mYWN0cyAmJiBQYWNrYWdlLmZhY3RzLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1tdWx0aXBsZXhlcnNcIiwgLTEpO1xuXG4gICAgLy8gQ2F1c2UgZnV0dXJlIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyBjYWxscyB0byB0aHJvdyAoYnV0IHRoZSBvblN0b3BcbiAgICAvLyBjYWxsYmFjayBzaG91bGQgbWFrZSBvdXIgY29ubmVjdGlvbiBmb3JnZXQgYWJvdXQgdXMpLlxuICAgIHNlbGYuX2hhbmRsZXMgPSBudWxsO1xuICB9LFxuXG4gIC8vIEFsbG93cyBhbGwgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIGNhbGxzIHRvIHJldHVybiwgb25jZSBhbGwgcHJlY2VkaW5nXG4gIC8vIGFkZHMgaGF2ZSBiZWVuIHByb2Nlc3NlZC4gRG9lcyBub3QgYmxvY2suXG4gIHJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3F1ZXVlLnF1ZXVlVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fcmVhZHkoKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJjYW4ndCBtYWtlIE9ic2VydmVNdWx0aXBsZXggcmVhZHkgdHdpY2UhXCIpO1xuICAgICAgc2VsZi5fcmVhZHlGdXR1cmUucmV0dXJuKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gSWYgdHJ5aW5nIHRvIGV4ZWN1dGUgdGhlIHF1ZXJ5IHJlc3VsdHMgaW4gYW4gZXJyb3IsIGNhbGwgdGhpcy4gVGhpcyBpc1xuICAvLyBpbnRlbmRlZCBmb3IgcGVybWFuZW50IGVycm9ycywgbm90IHRyYW5zaWVudCBuZXR3b3JrIGVycm9ycyB0aGF0IGNvdWxkIGJlXG4gIC8vIGZpeGVkLiBJdCBzaG91bGQgb25seSBiZSBjYWxsZWQgYmVmb3JlIHJlYWR5KCksIGJlY2F1c2UgaWYgeW91IGNhbGxlZCByZWFkeVxuICAvLyB0aGF0IG1lYW50IHRoYXQgeW91IG1hbmFnZWQgdG8gcnVuIHRoZSBxdWVyeSBvbmNlLiBJdCB3aWxsIHN0b3AgdGhpc1xuICAvLyBPYnNlcnZlTXVsdGlwbGV4IGFuZCBjYXVzZSBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgY2FsbHMgKGFuZCB0aHVzXG4gIC8vIG9ic2VydmVDaGFuZ2VzIGNhbGxzKSB0byB0aHJvdyB0aGUgZXJyb3IuXG4gIHF1ZXJ5RXJyb3I6IGZ1bmN0aW9uIChlcnIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fcXVldWUucnVuVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fcmVhZHkoKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJjYW4ndCBjbGFpbSBxdWVyeSBoYXMgYW4gZXJyb3IgYWZ0ZXIgaXQgd29ya2VkIVwiKTtcbiAgICAgIHNlbGYuX3N0b3Aoe2Zyb21RdWVyeUVycm9yOiB0cnVlfSk7XG4gICAgICBzZWxmLl9yZWFkeUZ1dHVyZS50aHJvdyhlcnIpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIENhbGxzIFwiY2JcIiBvbmNlIHRoZSBlZmZlY3RzIG9mIGFsbCBcInJlYWR5XCIsIFwiYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzXCJcbiAgLy8gYW5kIG9ic2VydmUgY2FsbGJhY2tzIHdoaWNoIGNhbWUgYmVmb3JlIHRoaXMgY2FsbCBoYXZlIGJlZW4gcHJvcGFnYXRlZCB0b1xuICAvLyBhbGwgaGFuZGxlcy4gXCJyZWFkeVwiIG11c3QgaGF2ZSBhbHJlYWR5IGJlZW4gY2FsbGVkIG9uIHRoaXMgbXVsdGlwbGV4ZXIuXG4gIG9uRmx1c2g6IGZ1bmN0aW9uIChjYikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9xdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCFzZWxmLl9yZWFkeSgpKVxuICAgICAgICB0aHJvdyBFcnJvcihcIm9ubHkgY2FsbCBvbkZsdXNoIG9uIGEgbXVsdGlwbGV4ZXIgdGhhdCB3aWxsIGJlIHJlYWR5XCIpO1xuICAgICAgY2IoKTtcbiAgICB9KTtcbiAgfSxcbiAgY2FsbGJhY2tOYW1lczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fb3JkZXJlZClcbiAgICAgIHJldHVybiBbXCJhZGRlZEJlZm9yZVwiLCBcImNoYW5nZWRcIiwgXCJtb3ZlZEJlZm9yZVwiLCBcInJlbW92ZWRcIl07XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIFtcImFkZGVkXCIsIFwiY2hhbmdlZFwiLCBcInJlbW92ZWRcIl07XG4gIH0sXG4gIF9yZWFkeTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9yZWFkeUZ1dHVyZS5pc1Jlc29sdmVkKCk7XG4gIH0sXG4gIF9hcHBseUNhbGxiYWNrOiBmdW5jdGlvbiAoY2FsbGJhY2tOYW1lLCBhcmdzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3F1ZXVlLnF1ZXVlVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBJZiB3ZSBzdG9wcGVkIGluIHRoZSBtZWFudGltZSwgZG8gbm90aGluZy5cbiAgICAgIGlmICghc2VsZi5faGFuZGxlcylcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyBGaXJzdCwgYXBwbHkgdGhlIGNoYW5nZSB0byB0aGUgY2FjaGUuXG4gICAgICAvLyBYWFggV2UgY291bGQgbWFrZSBhcHBseUNoYW5nZSBjYWxsYmFja3MgcHJvbWlzZSBub3QgdG8gaGFuZyBvbiB0byBhbnlcbiAgICAgIC8vIHN0YXRlIGZyb20gdGhlaXIgYXJndW1lbnRzIChhc3N1bWluZyB0aGF0IHRoZWlyIHN1cHBsaWVkIGNhbGxiYWNrc1xuICAgICAgLy8gZG9uJ3QpIGFuZCBza2lwIHRoaXMgY2xvbmUuIEN1cnJlbnRseSAnY2hhbmdlZCcgaGFuZ3Mgb24gdG8gc3RhdGVcbiAgICAgIC8vIHRob3VnaC5cbiAgICAgIHNlbGYuX2NhY2hlLmFwcGx5Q2hhbmdlW2NhbGxiYWNrTmFtZV0uYXBwbHkobnVsbCwgRUpTT04uY2xvbmUoYXJncykpO1xuXG4gICAgICAvLyBJZiB3ZSBoYXZlbid0IGZpbmlzaGVkIHRoZSBpbml0aWFsIGFkZHMsIHRoZW4gd2Ugc2hvdWxkIG9ubHkgYmUgZ2V0dGluZ1xuICAgICAgLy8gYWRkcy5cbiAgICAgIGlmICghc2VsZi5fcmVhZHkoKSAmJlxuICAgICAgICAgIChjYWxsYmFja05hbWUgIT09ICdhZGRlZCcgJiYgY2FsbGJhY2tOYW1lICE9PSAnYWRkZWRCZWZvcmUnKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHb3QgXCIgKyBjYWxsYmFja05hbWUgKyBcIiBkdXJpbmcgaW5pdGlhbCBhZGRzXCIpO1xuICAgICAgfVxuXG4gICAgICAvLyBOb3cgbXVsdGlwbGV4IHRoZSBjYWxsYmFja3Mgb3V0IHRvIGFsbCBvYnNlcnZlIGhhbmRsZXMuIEl0J3MgT0sgaWZcbiAgICAgIC8vIHRoZXNlIGNhbGxzIHlpZWxkOyBzaW5jZSB3ZSdyZSBpbnNpZGUgYSB0YXNrLCBubyBvdGhlciB1c2Ugb2Ygb3VyIHF1ZXVlXG4gICAgICAvLyBjYW4gY29udGludWUgdW50aWwgdGhlc2UgYXJlIGRvbmUuIChCdXQgd2UgZG8gaGF2ZSB0byBiZSBjYXJlZnVsIHRvIG5vdFxuICAgICAgLy8gdXNlIGEgaGFuZGxlIHRoYXQgZ290IHJlbW92ZWQsIGJlY2F1c2UgcmVtb3ZlSGFuZGxlIGRvZXMgbm90IHVzZSB0aGVcbiAgICAgIC8vIHF1ZXVlOyB0aHVzLCB3ZSBpdGVyYXRlIG92ZXIgYW4gYXJyYXkgb2Yga2V5cyB0aGF0IHdlIGNvbnRyb2wuKVxuICAgICAgXy5lYWNoKF8ua2V5cyhzZWxmLl9oYW5kbGVzKSwgZnVuY3Rpb24gKGhhbmRsZUlkKSB7XG4gICAgICAgIHZhciBoYW5kbGUgPSBzZWxmLl9oYW5kbGVzICYmIHNlbGYuX2hhbmRsZXNbaGFuZGxlSWRdO1xuICAgICAgICBpZiAoIWhhbmRsZSlcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGhhbmRsZVsnXycgKyBjYWxsYmFja05hbWVdO1xuICAgICAgICAvLyBjbG9uZSBhcmd1bWVudHMgc28gdGhhdCBjYWxsYmFja3MgY2FuIG11dGF0ZSB0aGVpciBhcmd1bWVudHNcbiAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2suYXBwbHkobnVsbCwgRUpTT04uY2xvbmUoYXJncykpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gU2VuZHMgaW5pdGlhbCBhZGRzIHRvIGEgaGFuZGxlLiBJdCBzaG91bGQgb25seSBiZSBjYWxsZWQgZnJvbSB3aXRoaW4gYSB0YXNrXG4gIC8vICh0aGUgdGFzayB0aGF0IGlzIHByb2Nlc3NpbmcgdGhlIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyBjYWxsKS4gSXRcbiAgLy8gc3luY2hyb25vdXNseSBpbnZva2VzIHRoZSBoYW5kbGUncyBhZGRlZCBvciBhZGRlZEJlZm9yZTsgdGhlcmUncyBubyBuZWVkIHRvXG4gIC8vIGZsdXNoIHRoZSBxdWV1ZSBhZnRlcndhcmRzIHRvIGVuc3VyZSB0aGF0IHRoZSBjYWxsYmFja3MgZ2V0IG91dC5cbiAgX3NlbmRBZGRzOiBmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9xdWV1ZS5zYWZlVG9SdW5UYXNrKCkpXG4gICAgICB0aHJvdyBFcnJvcihcIl9zZW5kQWRkcyBtYXkgb25seSBiZSBjYWxsZWQgZnJvbSB3aXRoaW4gYSB0YXNrIVwiKTtcbiAgICB2YXIgYWRkID0gc2VsZi5fb3JkZXJlZCA/IGhhbmRsZS5fYWRkZWRCZWZvcmUgOiBoYW5kbGUuX2FkZGVkO1xuICAgIGlmICghYWRkKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIG5vdGU6IGRvY3MgbWF5IGJlIGFuIF9JZE1hcCBvciBhbiBPcmRlcmVkRGljdFxuICAgIHNlbGYuX2NhY2hlLmRvY3MuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgaWYgKCFfLmhhcyhzZWxmLl9oYW5kbGVzLCBoYW5kbGUuX2lkKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJoYW5kbGUgZ290IHJlbW92ZWQgYmVmb3JlIHNlbmRpbmcgaW5pdGlhbCBhZGRzIVwiKTtcbiAgICAgIHZhciBmaWVsZHMgPSBFSlNPTi5jbG9uZShkb2MpO1xuICAgICAgZGVsZXRlIGZpZWxkcy5faWQ7XG4gICAgICBpZiAoc2VsZi5fb3JkZXJlZClcbiAgICAgICAgYWRkKGlkLCBmaWVsZHMsIG51bGwpOyAvLyB3ZSdyZSBnb2luZyBpbiBvcmRlciwgc28gYWRkIGF0IGVuZFxuICAgICAgZWxzZVxuICAgICAgICBhZGQoaWQsIGZpZWxkcyk7XG4gICAgfSk7XG4gIH1cbn0pO1xuXG5cbnZhciBuZXh0T2JzZXJ2ZUhhbmRsZUlkID0gMTtcbk9ic2VydmVIYW5kbGUgPSBmdW5jdGlvbiAobXVsdGlwbGV4ZXIsIGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vIFRoZSBlbmQgdXNlciBpcyBvbmx5IHN1cHBvc2VkIHRvIGNhbGwgc3RvcCgpLiAgVGhlIG90aGVyIGZpZWxkcyBhcmVcbiAgLy8gYWNjZXNzaWJsZSB0byB0aGUgbXVsdGlwbGV4ZXIsIHRob3VnaC5cbiAgc2VsZi5fbXVsdGlwbGV4ZXIgPSBtdWx0aXBsZXhlcjtcbiAgXy5lYWNoKG11bHRpcGxleGVyLmNhbGxiYWNrTmFtZXMoKSwgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAoY2FsbGJhY2tzW25hbWVdKSB7XG4gICAgICBzZWxmWydfJyArIG5hbWVdID0gY2FsbGJhY2tzW25hbWVdO1xuICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gXCJhZGRlZEJlZm9yZVwiICYmIGNhbGxiYWNrcy5hZGRlZCkge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlOiBpZiB5b3Ugc3BlY2lmeSBcImFkZGVkXCIgYW5kIFwibW92ZWRCZWZvcmVcIiwgeW91IGdldCBhblxuICAgICAgLy8gb3JkZXJlZCBvYnNlcnZlIHdoZXJlIGZvciBzb21lIHJlYXNvbiB5b3UgZG9uJ3QgZ2V0IG9yZGVyaW5nIGRhdGEgb25cbiAgICAgIC8vIHRoZSBhZGRzLiAgSSBkdW5ubywgd2Ugd3JvdGUgdGVzdHMgZm9yIGl0LCB0aGVyZSBtdXN0IGhhdmUgYmVlbiBhXG4gICAgICAvLyByZWFzb24uXG4gICAgICBzZWxmLl9hZGRlZEJlZm9yZSA9IGZ1bmN0aW9uIChpZCwgZmllbGRzLCBiZWZvcmUpIHtcbiAgICAgICAgY2FsbGJhY2tzLmFkZGVkKGlkLCBmaWVsZHMpO1xuICAgICAgfTtcbiAgICB9XG4gIH0pO1xuICBzZWxmLl9zdG9wcGVkID0gZmFsc2U7XG4gIHNlbGYuX2lkID0gbmV4dE9ic2VydmVIYW5kbGVJZCsrO1xufTtcbk9ic2VydmVIYW5kbGUucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgcmV0dXJuO1xuICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgc2VsZi5fbXVsdGlwbGV4ZXIucmVtb3ZlSGFuZGxlKHNlbGYuX2lkKTtcbn07XG4iLCJ2YXIgRmliZXIgPSBOcG0ucmVxdWlyZSgnZmliZXJzJyk7XG52YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuRG9jRmV0Y2hlciA9IGZ1bmN0aW9uIChtb25nb0Nvbm5lY3Rpb24pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLl9tb25nb0Nvbm5lY3Rpb24gPSBtb25nb0Nvbm5lY3Rpb247XG4gIC8vIE1hcCBmcm9tIGNhY2hlIGtleSAtPiBbY2FsbGJhY2tdXG4gIHNlbGYuX2NhbGxiYWNrc0ZvckNhY2hlS2V5ID0ge307XG59O1xuXG5fLmV4dGVuZChEb2NGZXRjaGVyLnByb3RvdHlwZSwge1xuICAvLyBGZXRjaGVzIGRvY3VtZW50IFwiaWRcIiBmcm9tIGNvbGxlY3Rpb25OYW1lLCByZXR1cm5pbmcgaXQgb3IgbnVsbCBpZiBub3RcbiAgLy8gZm91bmQuXG4gIC8vXG4gIC8vIElmIHlvdSBtYWtlIG11bHRpcGxlIGNhbGxzIHRvIGZldGNoKCkgd2l0aCB0aGUgc2FtZSBjYWNoZUtleSAoYSBzdHJpbmcpLFxuICAvLyBEb2NGZXRjaGVyIG1heSBhc3N1bWUgdGhhdCB0aGV5IGFsbCByZXR1cm4gdGhlIHNhbWUgZG9jdW1lbnQuIChJdCBkb2VzXG4gIC8vIG5vdCBjaGVjayB0byBzZWUgaWYgY29sbGVjdGlvbk5hbWUvaWQgbWF0Y2guKVxuICAvL1xuICAvLyBZb3UgbWF5IGFzc3VtZSB0aGF0IGNhbGxiYWNrIGlzIG5ldmVyIGNhbGxlZCBzeW5jaHJvbm91c2x5IChhbmQgaW4gZmFjdFxuICAvLyBPcGxvZ09ic2VydmVEcml2ZXIgZG9lcyBzbykuXG4gIGZldGNoOiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGlkLCBjYWNoZUtleSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBjaGVjayhjb2xsZWN0aW9uTmFtZSwgU3RyaW5nKTtcbiAgICAvLyBpZCBpcyBzb21lIHNvcnQgb2Ygc2NhbGFyXG4gICAgY2hlY2soY2FjaGVLZXksIFN0cmluZyk7XG5cbiAgICAvLyBJZiB0aGVyZSdzIGFscmVhZHkgYW4gaW4tcHJvZ3Jlc3MgZmV0Y2ggZm9yIHRoaXMgY2FjaGUga2V5LCB5aWVsZCB1bnRpbFxuICAgIC8vIGl0J3MgZG9uZSBhbmQgcmV0dXJuIHdoYXRldmVyIGl0IHJldHVybnMuXG4gICAgaWYgKF8uaGFzKHNlbGYuX2NhbGxiYWNrc0ZvckNhY2hlS2V5LCBjYWNoZUtleSkpIHtcbiAgICAgIHNlbGYuX2NhbGxiYWNrc0ZvckNhY2hlS2V5W2NhY2hlS2V5XS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY2FsbGJhY2tzID0gc2VsZi5fY2FsbGJhY2tzRm9yQ2FjaGVLZXlbY2FjaGVLZXldID0gW2NhbGxiYWNrXTtcblxuICAgIEZpYmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBkb2MgPSBzZWxmLl9tb25nb0Nvbm5lY3Rpb24uZmluZE9uZShcbiAgICAgICAgICBjb2xsZWN0aW9uTmFtZSwge19pZDogaWR9KSB8fCBudWxsO1xuICAgICAgICAvLyBSZXR1cm4gZG9jIHRvIGFsbCByZWxldmFudCBjYWxsYmFja3MuIE5vdGUgdGhhdCB0aGlzIGFycmF5IGNhblxuICAgICAgICAvLyBjb250aW51ZSB0byBncm93IGR1cmluZyBjYWxsYmFjayBleGNlY3V0aW9uLlxuICAgICAgICB3aGlsZSAoIV8uaXNFbXB0eShjYWxsYmFja3MpKSB7XG4gICAgICAgICAgLy8gQ2xvbmUgdGhlIGRvY3VtZW50IHNvIHRoYXQgdGhlIHZhcmlvdXMgY2FsbHMgdG8gZmV0Y2ggZG9uJ3QgcmV0dXJuXG4gICAgICAgICAgLy8gb2JqZWN0cyB0aGF0IGFyZSBpbnRlcnR3aW5nbGVkIHdpdGggZWFjaCBvdGhlci4gQ2xvbmUgYmVmb3JlXG4gICAgICAgICAgLy8gcG9wcGluZyB0aGUgZnV0dXJlLCBzbyB0aGF0IGlmIGNsb25lIHRocm93cywgdGhlIGVycm9yIGdldHMgcGFzc2VkXG4gICAgICAgICAgLy8gdG8gdGhlIG5leHQgY2FsbGJhY2suXG4gICAgICAgICAgdmFyIGNsb25lZERvYyA9IEVKU09OLmNsb25lKGRvYyk7XG4gICAgICAgICAgY2FsbGJhY2tzLnBvcCgpKG51bGwsIGNsb25lZERvYyk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgd2hpbGUgKCFfLmlzRW1wdHkoY2FsbGJhY2tzKSkge1xuICAgICAgICAgIGNhbGxiYWNrcy5wb3AoKShlKTtcbiAgICAgICAgfVxuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgLy8gWFhYIGNvbnNpZGVyIGtlZXBpbmcgdGhlIGRvYyBhcm91bmQgZm9yIGEgcGVyaW9kIG9mIHRpbWUgYmVmb3JlXG4gICAgICAgIC8vIHJlbW92aW5nIGZyb20gdGhlIGNhY2hlXG4gICAgICAgIGRlbGV0ZSBzZWxmLl9jYWxsYmFja3NGb3JDYWNoZUtleVtjYWNoZUtleV07XG4gICAgICB9XG4gICAgfSkucnVuKCk7XG4gIH1cbn0pO1xuXG5Nb25nb1Rlc3QuRG9jRmV0Y2hlciA9IERvY0ZldGNoZXI7XG4iLCJQb2xsaW5nT2JzZXJ2ZURyaXZlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiA9IG9wdGlvbnMuY3Vyc29yRGVzY3JpcHRpb247XG4gIHNlbGYuX21vbmdvSGFuZGxlID0gb3B0aW9ucy5tb25nb0hhbmRsZTtcbiAgc2VsZi5fb3JkZXJlZCA9IG9wdGlvbnMub3JkZXJlZDtcbiAgc2VsZi5fbXVsdGlwbGV4ZXIgPSBvcHRpb25zLm11bHRpcGxleGVyO1xuICBzZWxmLl9zdG9wQ2FsbGJhY2tzID0gW107XG4gIHNlbGYuX3N0b3BwZWQgPSBmYWxzZTtcblxuICBzZWxmLl9zeW5jaHJvbm91c0N1cnNvciA9IHNlbGYuX21vbmdvSGFuZGxlLl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvcihcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbik7XG5cbiAgLy8gcHJldmlvdXMgcmVzdWx0cyBzbmFwc2hvdC4gIG9uIGVhY2ggcG9sbCBjeWNsZSwgZGlmZnMgYWdhaW5zdFxuICAvLyByZXN1bHRzIGRyaXZlcyB0aGUgY2FsbGJhY2tzLlxuICBzZWxmLl9yZXN1bHRzID0gbnVsbDtcblxuICAvLyBUaGUgbnVtYmVyIG9mIF9wb2xsTW9uZ28gY2FsbHMgdGhhdCBoYXZlIGJlZW4gYWRkZWQgdG8gc2VsZi5fdGFza1F1ZXVlIGJ1dFxuICAvLyBoYXZlIG5vdCBzdGFydGVkIHJ1bm5pbmcuIFVzZWQgdG8gbWFrZSBzdXJlIHdlIG5ldmVyIHNjaGVkdWxlIG1vcmUgdGhhbiBvbmVcbiAgLy8gX3BvbGxNb25nbyAob3RoZXIgdGhhbiBwb3NzaWJseSB0aGUgb25lIHRoYXQgaXMgY3VycmVudGx5IHJ1bm5pbmcpLiBJdCdzXG4gIC8vIGFsc28gdXNlZCBieSBfc3VzcGVuZFBvbGxpbmcgdG8gcHJldGVuZCB0aGVyZSdzIGEgcG9sbCBzY2hlZHVsZWQuIFVzdWFsbHksXG4gIC8vIGl0J3MgZWl0aGVyIDAgKGZvciBcIm5vIHBvbGxzIHNjaGVkdWxlZCBvdGhlciB0aGFuIG1heWJlIG9uZSBjdXJyZW50bHlcbiAgLy8gcnVubmluZ1wiKSBvciAxIChmb3IgXCJhIHBvbGwgc2NoZWR1bGVkIHRoYXQgaXNuJ3QgcnVubmluZyB5ZXRcIiksIGJ1dCBpdCBjYW5cbiAgLy8gYWxzbyBiZSAyIGlmIGluY3JlbWVudGVkIGJ5IF9zdXNwZW5kUG9sbGluZy5cbiAgc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkID0gMDtcbiAgc2VsZi5fcGVuZGluZ1dyaXRlcyA9IFtdOyAvLyBwZW9wbGUgdG8gbm90aWZ5IHdoZW4gcG9sbGluZyBjb21wbGV0ZXNcblxuICAvLyBNYWtlIHN1cmUgdG8gY3JlYXRlIGEgc2VwYXJhdGVseSB0aHJvdHRsZWQgZnVuY3Rpb24gZm9yIGVhY2hcbiAgLy8gUG9sbGluZ09ic2VydmVEcml2ZXIgb2JqZWN0LlxuICBzZWxmLl9lbnN1cmVQb2xsSXNTY2hlZHVsZWQgPSBfLnRocm90dGxlKFxuICAgIHNlbGYuX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkLFxuICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMucG9sbGluZ1Rocm90dGxlTXMgfHwgNTAgLyogbXMgKi8pO1xuXG4gIC8vIFhYWCBmaWd1cmUgb3V0IGlmIHdlIHN0aWxsIG5lZWQgYSBxdWV1ZVxuICBzZWxmLl90YXNrUXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG5cbiAgdmFyIGxpc3RlbmVyc0hhbmRsZSA9IGxpc3RlbkFsbChcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgLy8gV2hlbiBzb21lb25lIGRvZXMgYSB0cmFuc2FjdGlvbiB0aGF0IG1pZ2h0IGFmZmVjdCB1cywgc2NoZWR1bGUgYSBwb2xsXG4gICAgICAvLyBvZiB0aGUgZGF0YWJhc2UuIElmIHRoYXQgdHJhbnNhY3Rpb24gaGFwcGVucyBpbnNpZGUgb2YgYSB3cml0ZSBmZW5jZSxcbiAgICAgIC8vIGJsb2NrIHRoZSBmZW5jZSB1bnRpbCB3ZSd2ZSBwb2xsZWQgYW5kIG5vdGlmaWVkIG9ic2VydmVycy5cbiAgICAgIHZhciBmZW5jZSA9IEREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UuZ2V0KCk7XG4gICAgICBpZiAoZmVuY2UpXG4gICAgICAgIHNlbGYuX3BlbmRpbmdXcml0ZXMucHVzaChmZW5jZS5iZWdpbldyaXRlKCkpO1xuICAgICAgLy8gRW5zdXJlIGEgcG9sbCBpcyBzY2hlZHVsZWQuLi4gYnV0IGlmIHdlIGFscmVhZHkga25vdyB0aGF0IG9uZSBpcyxcbiAgICAgIC8vIGRvbid0IGhpdCB0aGUgdGhyb3R0bGVkIF9lbnN1cmVQb2xsSXNTY2hlZHVsZWQgZnVuY3Rpb24gKHdoaWNoIG1pZ2h0XG4gICAgICAvLyBsZWFkIHRvIHVzIGNhbGxpbmcgaXQgdW5uZWNlc3NhcmlseSBpbiA8cG9sbGluZ1Rocm90dGxlTXM+IG1zKS5cbiAgICAgIGlmIChzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgPT09IDApXG4gICAgICAgIHNlbGYuX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCgpO1xuICAgIH1cbiAgKTtcbiAgc2VsZi5fc3RvcENhbGxiYWNrcy5wdXNoKGZ1bmN0aW9uICgpIHsgbGlzdGVuZXJzSGFuZGxlLnN0b3AoKTsgfSk7XG5cbiAgLy8gZXZlcnkgb25jZSBhbmQgYSB3aGlsZSwgcG9sbCBldmVuIGlmIHdlIGRvbid0IHRoaW5rIHdlJ3JlIGRpcnR5LCBmb3JcbiAgLy8gZXZlbnR1YWwgY29uc2lzdGVuY3kgd2l0aCBkYXRhYmFzZSB3cml0ZXMgZnJvbSBvdXRzaWRlIHRoZSBNZXRlb3JcbiAgLy8gdW5pdmVyc2UuXG4gIC8vXG4gIC8vIEZvciB0ZXN0aW5nLCB0aGVyZSdzIGFuIHVuZG9jdW1lbnRlZCBjYWxsYmFjayBhcmd1bWVudCB0byBvYnNlcnZlQ2hhbmdlc1xuICAvLyB3aGljaCBkaXNhYmxlcyB0aW1lLWJhc2VkIHBvbGxpbmcgYW5kIGdldHMgY2FsbGVkIGF0IHRoZSBiZWdpbm5pbmcgb2YgZWFjaFxuICAvLyBwb2xsLlxuICBpZiAob3B0aW9ucy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2spIHtcbiAgICBzZWxmLl90ZXN0T25seVBvbGxDYWxsYmFjayA9IG9wdGlvbnMuX3Rlc3RPbmx5UG9sbENhbGxiYWNrO1xuICB9IGVsc2Uge1xuICAgIHZhciBwb2xsaW5nSW50ZXJ2YWwgPVxuICAgICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMucG9sbGluZ0ludGVydmFsTXMgfHxcbiAgICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLl9wb2xsaW5nSW50ZXJ2YWwgfHwgLy8gQ09NUEFUIHdpdGggMS4yXG4gICAgICAgICAgMTAgKiAxMDAwO1xuICAgIHZhciBpbnRlcnZhbEhhbmRsZSA9IE1ldGVvci5zZXRJbnRlcnZhbChcbiAgICAgIF8uYmluZChzZWxmLl9lbnN1cmVQb2xsSXNTY2hlZHVsZWQsIHNlbGYpLCBwb2xsaW5nSW50ZXJ2YWwpO1xuICAgIHNlbGYuX3N0b3BDYWxsYmFja3MucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICBNZXRlb3IuY2xlYXJJbnRlcnZhbChpbnRlcnZhbEhhbmRsZSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBNYWtlIHN1cmUgd2UgYWN0dWFsbHkgcG9sbCBzb29uIVxuICBzZWxmLl91bnRocm90dGxlZEVuc3VyZVBvbGxJc1NjaGVkdWxlZCgpO1xuXG4gIFBhY2thZ2UuZmFjdHMgJiYgUGFja2FnZS5mYWN0cy5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtcG9sbGluZ1wiLCAxKTtcbn07XG5cbl8uZXh0ZW5kKFBvbGxpbmdPYnNlcnZlRHJpdmVyLnByb3RvdHlwZSwge1xuICAvLyBUaGlzIGlzIGFsd2F5cyBjYWxsZWQgdGhyb3VnaCBfLnRocm90dGxlIChleGNlcHQgb25jZSBhdCBzdGFydHVwKS5cbiAgX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgPiAwKVxuICAgICAgcmV0dXJuO1xuICAgICsrc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkO1xuICAgIHNlbGYuX3Rhc2tRdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcG9sbE1vbmdvKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gdGVzdC1vbmx5IGludGVyZmFjZSBmb3IgY29udHJvbGxpbmcgcG9sbGluZy5cbiAgLy9cbiAgLy8gX3N1c3BlbmRQb2xsaW5nIGJsb2NrcyB1bnRpbCBhbnkgY3VycmVudGx5IHJ1bm5pbmcgYW5kIHNjaGVkdWxlZCBwb2xscyBhcmVcbiAgLy8gZG9uZSwgYW5kIHByZXZlbnRzIGFueSBmdXJ0aGVyIHBvbGxzIGZyb20gYmVpbmcgc2NoZWR1bGVkLiAobmV3XG4gIC8vIE9ic2VydmVIYW5kbGVzIGNhbiBiZSBhZGRlZCBhbmQgcmVjZWl2ZSB0aGVpciBpbml0aWFsIGFkZGVkIGNhbGxiYWNrcyxcbiAgLy8gdGhvdWdoLilcbiAgLy9cbiAgLy8gX3Jlc3VtZVBvbGxpbmcgaW1tZWRpYXRlbHkgcG9sbHMsIGFuZCBhbGxvd3MgZnVydGhlciBwb2xscyB0byBvY2N1ci5cbiAgX3N1c3BlbmRQb2xsaW5nOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gUHJldGVuZCB0aGF0IHRoZXJlJ3MgYW5vdGhlciBwb2xsIHNjaGVkdWxlZCAod2hpY2ggd2lsbCBwcmV2ZW50XG4gICAgLy8gX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCBmcm9tIHF1ZXVlaW5nIGFueSBtb3JlIHBvbGxzKS5cbiAgICArK3NlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDtcbiAgICAvLyBOb3cgYmxvY2sgdW50aWwgYWxsIGN1cnJlbnRseSBydW5uaW5nIG9yIHNjaGVkdWxlZCBwb2xscyBhcmUgZG9uZS5cbiAgICBzZWxmLl90YXNrUXVldWUucnVuVGFzayhmdW5jdGlvbigpIHt9KTtcblxuICAgIC8vIENvbmZpcm0gdGhhdCB0aGVyZSBpcyBvbmx5IG9uZSBcInBvbGxcIiAodGhlIGZha2Ugb25lIHdlJ3JlIHByZXRlbmRpbmcgdG9cbiAgICAvLyBoYXZlKSBzY2hlZHVsZWQuXG4gICAgaWYgKHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCAhPT0gMSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgaXMgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCk7XG4gIH0sXG4gIF9yZXN1bWVQb2xsaW5nOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gV2Ugc2hvdWxkIGJlIGluIHRoZSBzYW1lIHN0YXRlIGFzIGluIHRoZSBlbmQgb2YgX3N1c3BlbmRQb2xsaW5nLlxuICAgIGlmIChzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgIT09IDEpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJfcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkIGlzIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQpO1xuICAgIC8vIFJ1biBhIHBvbGwgc3luY2hyb25vdXNseSAod2hpY2ggd2lsbCBjb3VudGVyYWN0IHRoZVxuICAgIC8vICsrX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCBmcm9tIF9zdXNwZW5kUG9sbGluZykuXG4gICAgc2VsZi5fdGFza1F1ZXVlLnJ1blRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcG9sbE1vbmdvKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX3BvbGxNb25nbzogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAtLXNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDtcblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdmFyIGZpcnN0ID0gZmFsc2U7XG4gICAgdmFyIG5ld1Jlc3VsdHM7XG4gICAgdmFyIG9sZFJlc3VsdHMgPSBzZWxmLl9yZXN1bHRzO1xuICAgIGlmICghb2xkUmVzdWx0cykge1xuICAgICAgZmlyc3QgPSB0cnVlO1xuICAgICAgLy8gWFhYIG1heWJlIHVzZSBPcmRlcmVkRGljdCBpbnN0ZWFkP1xuICAgICAgb2xkUmVzdWx0cyA9IHNlbGYuX29yZGVyZWQgPyBbXSA6IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgIH1cblxuICAgIHNlbGYuX3Rlc3RPbmx5UG9sbENhbGxiYWNrICYmIHNlbGYuX3Rlc3RPbmx5UG9sbENhbGxiYWNrKCk7XG5cbiAgICAvLyBTYXZlIHRoZSBsaXN0IG9mIHBlbmRpbmcgd3JpdGVzIHdoaWNoIHRoaXMgcm91bmQgd2lsbCBjb21taXQuXG4gICAgdmFyIHdyaXRlc0ZvckN5Y2xlID0gc2VsZi5fcGVuZGluZ1dyaXRlcztcbiAgICBzZWxmLl9wZW5kaW5nV3JpdGVzID0gW107XG5cbiAgICAvLyBHZXQgdGhlIG5ldyBxdWVyeSByZXN1bHRzLiAoVGhpcyB5aWVsZHMuKVxuICAgIHRyeSB7XG4gICAgICBuZXdSZXN1bHRzID0gc2VsZi5fc3luY2hyb25vdXNDdXJzb3IuZ2V0UmF3T2JqZWN0cyhzZWxmLl9vcmRlcmVkKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZmlyc3QgJiYgdHlwZW9mKGUuY29kZSkgPT09ICdudW1iZXInKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYW4gZXJyb3IgZG9jdW1lbnQgc2VudCB0byB1cyBieSBtb25nb2QsIG5vdCBhIGNvbm5lY3Rpb25cbiAgICAgICAgLy8gZXJyb3IgZ2VuZXJhdGVkIGJ5IHRoZSBjbGllbnQuIEFuZCB3ZSd2ZSBuZXZlciBzZWVuIHRoaXMgcXVlcnkgd29ya1xuICAgICAgICAvLyBzdWNjZXNzZnVsbHkuIFByb2JhYmx5IGl0J3MgYSBiYWQgc2VsZWN0b3Igb3Igc29tZXRoaW5nLCBzbyB3ZSBzaG91bGRcbiAgICAgICAgLy8gTk9UIHJldHJ5LiBJbnN0ZWFkLCB3ZSBzaG91bGQgaGFsdCB0aGUgb2JzZXJ2ZSAod2hpY2ggZW5kcyB1cCBjYWxsaW5nXG4gICAgICAgIC8vIGBzdG9wYCBvbiB1cykuXG4gICAgICAgIHNlbGYuX211bHRpcGxleGVyLnF1ZXJ5RXJyb3IoXG4gICAgICAgICAgbmV3IEVycm9yKFxuICAgICAgICAgICAgXCJFeGNlcHRpb24gd2hpbGUgcG9sbGluZyBxdWVyeSBcIiArXG4gICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uKSArIFwiOiBcIiArIGUubWVzc2FnZSkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGdldFJhd09iamVjdHMgY2FuIHRocm93IGlmIHdlJ3JlIGhhdmluZyB0cm91YmxlIHRhbGtpbmcgdG8gdGhlXG4gICAgICAvLyBkYXRhYmFzZS4gIFRoYXQncyBmaW5lIC0tLSB3ZSB3aWxsIHJlcG9sbCBsYXRlciBhbnl3YXkuIEJ1dCB3ZSBzaG91bGRcbiAgICAgIC8vIG1ha2Ugc3VyZSBub3QgdG8gbG9zZSB0cmFjayBvZiB0aGlzIGN5Y2xlJ3Mgd3JpdGVzLlxuICAgICAgLy8gKEl0IGFsc28gY2FuIHRocm93IGlmIHRoZXJlJ3MganVzdCBzb21ldGhpbmcgaW52YWxpZCBhYm91dCB0aGlzIHF1ZXJ5O1xuICAgICAgLy8gdW5mb3J0dW5hdGVseSB0aGUgT2JzZXJ2ZURyaXZlciBBUEkgZG9lc24ndCBwcm92aWRlIGEgZ29vZCB3YXkgdG9cbiAgICAgIC8vIFwiY2FuY2VsXCIgdGhlIG9ic2VydmUgZnJvbSB0aGUgaW5zaWRlIGluIHRoaXMgY2FzZS5cbiAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHNlbGYuX3BlbmRpbmdXcml0ZXMsIHdyaXRlc0ZvckN5Y2xlKTtcbiAgICAgIE1ldGVvci5fZGVidWcoXCJFeGNlcHRpb24gd2hpbGUgcG9sbGluZyBxdWVyeSBcIiArXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uKSArIFwiOiBcIiArIGUuc3RhY2spO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFJ1biBkaWZmcy5cbiAgICBpZiAoIXNlbGYuX3N0b3BwZWQpIHtcbiAgICAgIExvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5Q2hhbmdlcyhcbiAgICAgICAgc2VsZi5fb3JkZXJlZCwgb2xkUmVzdWx0cywgbmV3UmVzdWx0cywgc2VsZi5fbXVsdGlwbGV4ZXIpO1xuICAgIH1cblxuICAgIC8vIFNpZ25hbHMgdGhlIG11bHRpcGxleGVyIHRvIGFsbG93IGFsbCBvYnNlcnZlQ2hhbmdlcyBjYWxscyB0aGF0IHNoYXJlIHRoaXNcbiAgICAvLyBtdWx0aXBsZXhlciB0byByZXR1cm4uIChUaGlzIGhhcHBlbnMgYXN5bmNocm9ub3VzbHksIHZpYSB0aGVcbiAgICAvLyBtdWx0aXBsZXhlcidzIHF1ZXVlLilcbiAgICBpZiAoZmlyc3QpXG4gICAgICBzZWxmLl9tdWx0aXBsZXhlci5yZWFkeSgpO1xuXG4gICAgLy8gUmVwbGFjZSBzZWxmLl9yZXN1bHRzIGF0b21pY2FsbHkuICAoVGhpcyBhc3NpZ25tZW50IGlzIHdoYXQgbWFrZXMgYGZpcnN0YFxuICAgIC8vIHN0YXkgdGhyb3VnaCBvbiB0aGUgbmV4dCBjeWNsZSwgc28gd2UndmUgd2FpdGVkIHVudGlsIGFmdGVyIHdlJ3ZlXG4gICAgLy8gY29tbWl0dGVkIHRvIHJlYWR5LWluZyB0aGUgbXVsdGlwbGV4ZXIuKVxuICAgIHNlbGYuX3Jlc3VsdHMgPSBuZXdSZXN1bHRzO1xuXG4gICAgLy8gT25jZSB0aGUgT2JzZXJ2ZU11bHRpcGxleGVyIGhhcyBwcm9jZXNzZWQgZXZlcnl0aGluZyB3ZSd2ZSBkb25lIGluIHRoaXNcbiAgICAvLyByb3VuZCwgbWFyayBhbGwgdGhlIHdyaXRlcyB3aGljaCBleGlzdGVkIGJlZm9yZSB0aGlzIGNhbGwgYXNcbiAgICAvLyBjb21tbWl0dGVkLiAoSWYgbmV3IHdyaXRlcyBoYXZlIHNob3duIHVwIGluIHRoZSBtZWFudGltZSwgdGhlcmUnbGxcbiAgICAvLyBhbHJlYWR5IGJlIGFub3RoZXIgX3BvbGxNb25nbyB0YXNrIHNjaGVkdWxlZC4pXG4gICAgc2VsZi5fbXVsdGlwbGV4ZXIub25GbHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICBfLmVhY2god3JpdGVzRm9yQ3ljbGUsIGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHcuY29tbWl0dGVkKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3N0b3BwZWQgPSB0cnVlO1xuICAgIF8uZWFjaChzZWxmLl9zdG9wQ2FsbGJhY2tzLCBmdW5jdGlvbiAoYykgeyBjKCk7IH0pO1xuICAgIC8vIFJlbGVhc2UgYW55IHdyaXRlIGZlbmNlcyB0aGF0IGFyZSB3YWl0aW5nIG9uIHVzLlxuICAgIF8uZWFjaChzZWxmLl9wZW5kaW5nV3JpdGVzLCBmdW5jdGlvbiAodykge1xuICAgICAgdy5jb21taXR0ZWQoKTtcbiAgICB9KTtcbiAgICBQYWNrYWdlLmZhY3RzICYmIFBhY2thZ2UuZmFjdHMuRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtcG9sbGluZ1wiLCAtMSk7XG4gIH1cbn0pO1xuIiwidmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbnZhciBQSEFTRSA9IHtcbiAgUVVFUllJTkc6IFwiUVVFUllJTkdcIixcbiAgRkVUQ0hJTkc6IFwiRkVUQ0hJTkdcIixcbiAgU1RFQURZOiBcIlNURUFEWVwiXG59O1xuXG4vLyBFeGNlcHRpb24gdGhyb3duIGJ5IF9uZWVkVG9Qb2xsUXVlcnkgd2hpY2ggdW5yb2xscyB0aGUgc3RhY2sgdXAgdG8gdGhlXG4vLyBlbmNsb3NpbmcgY2FsbCB0byBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeS5cbnZhciBTd2l0Y2hlZFRvUXVlcnkgPSBmdW5jdGlvbiAoKSB7fTtcbnZhciBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSA9IGZ1bmN0aW9uIChmKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGYuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgU3dpdGNoZWRUb1F1ZXJ5KSlcbiAgICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH07XG59O1xuXG52YXIgY3VycmVudElkID0gMDtcblxuLy8gT3Bsb2dPYnNlcnZlRHJpdmVyIGlzIGFuIGFsdGVybmF0aXZlIHRvIFBvbGxpbmdPYnNlcnZlRHJpdmVyIHdoaWNoIGZvbGxvd3Ncbi8vIHRoZSBNb25nbyBvcGVyYXRpb24gbG9nIGluc3RlYWQgb2YganVzdCByZS1wb2xsaW5nIHRoZSBxdWVyeS4gSXQgb2JleXMgdGhlXG4vLyBzYW1lIHNpbXBsZSBpbnRlcmZhY2U6IGNvbnN0cnVjdGluZyBpdCBzdGFydHMgc2VuZGluZyBvYnNlcnZlQ2hhbmdlc1xuLy8gY2FsbGJhY2tzIChhbmQgYSByZWFkeSgpIGludm9jYXRpb24pIHRvIHRoZSBPYnNlcnZlTXVsdGlwbGV4ZXIsIGFuZCB5b3Ugc3RvcFxuLy8gaXQgYnkgY2FsbGluZyB0aGUgc3RvcCgpIG1ldGhvZC5cbk9wbG9nT2JzZXJ2ZURyaXZlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5fdXNlc09wbG9nID0gdHJ1ZTsgIC8vIHRlc3RzIGxvb2sgYXQgdGhpc1xuXG4gIHNlbGYuX2lkID0gY3VycmVudElkO1xuICBjdXJyZW50SWQrKztcblxuICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiA9IG9wdGlvbnMuY3Vyc29yRGVzY3JpcHRpb247XG4gIHNlbGYuX21vbmdvSGFuZGxlID0gb3B0aW9ucy5tb25nb0hhbmRsZTtcbiAgc2VsZi5fbXVsdGlwbGV4ZXIgPSBvcHRpb25zLm11bHRpcGxleGVyO1xuXG4gIGlmIChvcHRpb25zLm9yZGVyZWQpIHtcbiAgICB0aHJvdyBFcnJvcihcIk9wbG9nT2JzZXJ2ZURyaXZlciBvbmx5IHN1cHBvcnRzIHVub3JkZXJlZCBvYnNlcnZlQ2hhbmdlc1wiKTtcbiAgfVxuXG4gIHZhciBzb3J0ZXIgPSBvcHRpb25zLnNvcnRlcjtcbiAgLy8gV2UgZG9uJ3Qgc3VwcG9ydCAkbmVhciBhbmQgb3RoZXIgZ2VvLXF1ZXJpZXMgc28gaXQncyBPSyB0byBpbml0aWFsaXplIHRoZVxuICAvLyBjb21wYXJhdG9yIG9ubHkgb25jZSBpbiB0aGUgY29uc3RydWN0b3IuXG4gIHZhciBjb21wYXJhdG9yID0gc29ydGVyICYmIHNvcnRlci5nZXRDb21wYXJhdG9yKCk7XG5cbiAgaWYgKG9wdGlvbnMuY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5saW1pdCkge1xuICAgIC8vIFRoZXJlIGFyZSBzZXZlcmFsIHByb3BlcnRpZXMgb3JkZXJlZCBkcml2ZXIgaW1wbGVtZW50czpcbiAgICAvLyAtIF9saW1pdCBpcyBhIHBvc2l0aXZlIG51bWJlclxuICAgIC8vIC0gX2NvbXBhcmF0b3IgaXMgYSBmdW5jdGlvbi1jb21wYXJhdG9yIGJ5IHdoaWNoIHRoZSBxdWVyeSBpcyBvcmRlcmVkXG4gICAgLy8gLSBfdW5wdWJsaXNoZWRCdWZmZXIgaXMgbm9uLW51bGwgTWluL01heCBIZWFwLFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIHRoZSBlbXB0eSBidWZmZXIgaW4gU1RFQURZIHBoYXNlIGltcGxpZXMgdGhhdCB0aGVcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICBldmVyeXRoaW5nIHRoYXQgbWF0Y2hlcyB0aGUgcXVlcmllcyBzZWxlY3RvciBmaXRzXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgaW50byBwdWJsaXNoZWQgc2V0LlxuICAgIC8vIC0gX3B1Ymxpc2hlZCAtIE1pbiBIZWFwIChhbHNvIGltcGxlbWVudHMgSWRNYXAgbWV0aG9kcylcblxuICAgIHZhciBoZWFwT3B0aW9ucyA9IHsgSWRNYXA6IExvY2FsQ29sbGVjdGlvbi5fSWRNYXAgfTtcbiAgICBzZWxmLl9saW1pdCA9IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMubGltaXQ7XG4gICAgc2VsZi5fY29tcGFyYXRvciA9IGNvbXBhcmF0b3I7XG4gICAgc2VsZi5fc29ydGVyID0gc29ydGVyO1xuICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyID0gbmV3IE1pbk1heEhlYXAoY29tcGFyYXRvciwgaGVhcE9wdGlvbnMpO1xuICAgIC8vIFdlIG5lZWQgc29tZXRoaW5nIHRoYXQgY2FuIGZpbmQgTWF4IHZhbHVlIGluIGFkZGl0aW9uIHRvIElkTWFwIGludGVyZmFjZVxuICAgIHNlbGYuX3B1Ymxpc2hlZCA9IG5ldyBNYXhIZWFwKGNvbXBhcmF0b3IsIGhlYXBPcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICBzZWxmLl9saW1pdCA9IDA7XG4gICAgc2VsZi5fY29tcGFyYXRvciA9IG51bGw7XG4gICAgc2VsZi5fc29ydGVyID0gbnVsbDtcbiAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciA9IG51bGw7XG4gICAgc2VsZi5fcHVibGlzaGVkID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH1cblxuICAvLyBJbmRpY2F0ZXMgaWYgaXQgaXMgc2FmZSB0byBpbnNlcnQgYSBuZXcgZG9jdW1lbnQgYXQgdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIC8vIGZvciB0aGlzIHF1ZXJ5LiBpLmUuIGl0IGlzIGtub3duIHRoYXQgdGhlcmUgYXJlIG5vIGRvY3VtZW50cyBtYXRjaGluZyB0aGVcbiAgLy8gc2VsZWN0b3IgdGhvc2UgYXJlIG5vdCBpbiBwdWJsaXNoZWQgb3IgYnVmZmVyLlxuICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcblxuICBzZWxmLl9zdG9wcGVkID0gZmFsc2U7XG4gIHNlbGYuX3N0b3BIYW5kbGVzID0gW107XG5cbiAgUGFja2FnZS5mYWN0cyAmJiBQYWNrYWdlLmZhY3RzLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1vcGxvZ1wiLCAxKTtcblxuICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLlFVRVJZSU5HKTtcblxuICBzZWxmLl9tYXRjaGVyID0gb3B0aW9ucy5tYXRjaGVyO1xuICB2YXIgcHJvamVjdGlvbiA9IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuZmllbGRzIHx8IHt9O1xuICBzZWxmLl9wcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKHByb2plY3Rpb24pO1xuICAvLyBQcm9qZWN0aW9uIGZ1bmN0aW9uLCByZXN1bHQgb2YgY29tYmluaW5nIGltcG9ydGFudCBmaWVsZHMgZm9yIHNlbGVjdG9yIGFuZFxuICAvLyBleGlzdGluZyBmaWVsZHMgcHJvamVjdGlvblxuICBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uID0gc2VsZi5fbWF0Y2hlci5jb21iaW5lSW50b1Byb2plY3Rpb24ocHJvamVjdGlvbik7XG4gIGlmIChzb3J0ZXIpXG4gICAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbiA9IHNvcnRlci5jb21iaW5lSW50b1Byb2plY3Rpb24oc2VsZi5fc2hhcmVkUHJvamVjdGlvbik7XG4gIHNlbGYuX3NoYXJlZFByb2plY3Rpb25GbiA9IExvY2FsQ29sbGVjdGlvbi5fY29tcGlsZVByb2plY3Rpb24oXG4gICAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbik7XG5cbiAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBudWxsO1xuICBzZWxmLl9mZXRjaEdlbmVyYXRpb24gPSAwO1xuXG4gIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IGZhbHNlO1xuICBzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5ID0gW107XG5cbiAgLy8gSWYgdGhlIG9wbG9nIGhhbmRsZSB0ZWxscyB1cyB0aGF0IGl0IHNraXBwZWQgc29tZSBlbnRyaWVzIChiZWNhdXNlIGl0IGdvdFxuICAvLyBiZWhpbmQsIHNheSksIHJlLXBvbGwuXG4gIHNlbGYuX3N0b3BIYW5kbGVzLnB1c2goc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLm9uU2tpcHBlZEVudHJpZXMoXG4gICAgZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgfSlcbiAgKSk7XG5cbiAgZm9yRWFjaFRyaWdnZXIoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uICh0cmlnZ2VyKSB7XG4gICAgc2VsZi5fc3RvcEhhbmRsZXMucHVzaChzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUub25PcGxvZ0VudHJ5KFxuICAgICAgdHJpZ2dlciwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIG9wID0gbm90aWZpY2F0aW9uLm9wO1xuICAgICAgICAgIGlmIChub3RpZmljYXRpb24uZHJvcENvbGxlY3Rpb24gfHwgbm90aWZpY2F0aW9uLmRyb3BEYXRhYmFzZSkge1xuICAgICAgICAgICAgLy8gTm90ZTogdGhpcyBjYWxsIGlzIG5vdCBhbGxvd2VkIHRvIGJsb2NrIG9uIGFueXRoaW5nIChlc3BlY2lhbGx5XG4gICAgICAgICAgICAvLyBvbiB3YWl0aW5nIGZvciBvcGxvZyBlbnRyaWVzIHRvIGNhdGNoIHVwKSBiZWNhdXNlIHRoYXQgd2lsbCBibG9ja1xuICAgICAgICAgICAgLy8gb25PcGxvZ0VudHJ5IVxuICAgICAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEFsbCBvdGhlciBvcGVyYXRvcnMgc2hvdWxkIGJlIGhhbmRsZWQgZGVwZW5kaW5nIG9uIHBoYXNlXG4gICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZyhvcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzZWxmLl9oYW5kbGVPcGxvZ0VudHJ5U3RlYWR5T3JGZXRjaGluZyhvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgKSk7XG4gIH0pO1xuXG4gIC8vIFhYWCBvcmRlcmluZyB3LnIudC4gZXZlcnl0aGluZyBlbHNlP1xuICBzZWxmLl9zdG9wSGFuZGxlcy5wdXNoKGxpc3RlbkFsbChcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgLy8gSWYgd2UncmUgbm90IGluIGEgcHJlLWZpcmUgd3JpdGUgZmVuY2UsIHdlIGRvbid0IGhhdmUgdG8gZG8gYW55dGhpbmcuXG4gICAgICB2YXIgZmVuY2UgPSBERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLmdldCgpO1xuICAgICAgaWYgKCFmZW5jZSB8fCBmZW5jZS5maXJlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBpZiAoZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnMpIHtcbiAgICAgICAgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnNbc2VsZi5faWRdID0gc2VsZjtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycyA9IHt9O1xuICAgICAgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnNbc2VsZi5faWRdID0gc2VsZjtcblxuICAgICAgZmVuY2Uub25CZWZvcmVGaXJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRyaXZlcnMgPSBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycztcbiAgICAgICAgZGVsZXRlIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzO1xuXG4gICAgICAgIC8vIFRoaXMgZmVuY2UgY2Fubm90IGZpcmUgdW50aWwgd2UndmUgY2F1Z2h0IHVwIHRvIFwidGhpcyBwb2ludFwiIGluIHRoZVxuICAgICAgICAvLyBvcGxvZywgYW5kIGFsbCBvYnNlcnZlcnMgbWFkZSBpdCBiYWNrIHRvIHRoZSBzdGVhZHkgc3RhdGUuXG4gICAgICAgIHNlbGYuX21vbmdvSGFuZGxlLl9vcGxvZ0hhbmRsZS53YWl0VW50aWxDYXVnaHRVcCgpO1xuXG4gICAgICAgIF8uZWFjaChkcml2ZXJzLCBmdW5jdGlvbiAoZHJpdmVyKSB7XG4gICAgICAgICAgaWYgKGRyaXZlci5fc3RvcHBlZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgIHZhciB3cml0ZSA9IGZlbmNlLmJlZ2luV3JpdGUoKTtcbiAgICAgICAgICBpZiAoZHJpdmVyLl9waGFzZSA9PT0gUEhBU0UuU1RFQURZKSB7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhhdCBhbGwgb2YgdGhlIGNhbGxiYWNrcyBoYXZlIG1hZGUgaXQgdGhyb3VnaCB0aGVcbiAgICAgICAgICAgIC8vIG11bHRpcGxleGVyIGFuZCBiZWVuIGRlbGl2ZXJlZCB0byBPYnNlcnZlSGFuZGxlcyBiZWZvcmUgY29tbWl0dGluZ1xuICAgICAgICAgICAgLy8gd3JpdGVzLlxuICAgICAgICAgICAgZHJpdmVyLl9tdWx0aXBsZXhlci5vbkZsdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHJpdmVyLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5LnB1c2god3JpdGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICkpO1xuXG4gIC8vIFdoZW4gTW9uZ28gZmFpbHMgb3Zlciwgd2UgbmVlZCB0byByZXBvbGwgdGhlIHF1ZXJ5LCBpbiBjYXNlIHdlIHByb2Nlc3NlZCBhblxuICAvLyBvcGxvZyBlbnRyeSB0aGF0IGdvdCByb2xsZWQgYmFjay5cbiAgc2VsZi5fc3RvcEhhbmRsZXMucHVzaChzZWxmLl9tb25nb0hhbmRsZS5fb25GYWlsb3ZlcihmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShcbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICB9KSkpO1xuXG4gIC8vIEdpdmUgX29ic2VydmVDaGFuZ2VzIGEgY2hhbmNlIHRvIGFkZCB0aGUgbmV3IE9ic2VydmVIYW5kbGUgdG8gb3VyXG4gIC8vIG11bHRpcGxleGVyLCBzbyB0aGF0IHRoZSBhZGRlZCBjYWxscyBnZXQgc3RyZWFtZWQuXG4gIE1ldGVvci5kZWZlcihmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi5fcnVuSW5pdGlhbFF1ZXJ5KCk7XG4gIH0pKTtcbn07XG5cbl8uZXh0ZW5kKE9wbG9nT2JzZXJ2ZURyaXZlci5wcm90b3R5cGUsIHtcbiAgX2FkZFB1Ymxpc2hlZDogZnVuY3Rpb24gKGlkLCBkb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGZpZWxkcyA9IF8uY2xvbmUoZG9jKTtcbiAgICAgIGRlbGV0ZSBmaWVsZHMuX2lkO1xuICAgICAgc2VsZi5fcHVibGlzaGVkLnNldChpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKGRvYykpO1xuICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIuYWRkZWQoaWQsIHNlbGYuX3Byb2plY3Rpb25GbihmaWVsZHMpKTtcblxuICAgICAgLy8gQWZ0ZXIgYWRkaW5nIHRoaXMgZG9jdW1lbnQsIHRoZSBwdWJsaXNoZWQgc2V0IG1pZ2h0IGJlIG92ZXJmbG93ZWRcbiAgICAgIC8vIChleGNlZWRpbmcgY2FwYWNpdHkgc3BlY2lmaWVkIGJ5IGxpbWl0KS4gSWYgc28sIHB1c2ggdGhlIG1heGltdW1cbiAgICAgIC8vIGVsZW1lbnQgdG8gdGhlIGJ1ZmZlciwgd2UgbWlnaHQgd2FudCB0byBzYXZlIGl0IGluIG1lbW9yeSB0byByZWR1Y2UgdGhlXG4gICAgICAvLyBhbW91bnQgb2YgTW9uZ28gbG9va3VwcyBpbiB0aGUgZnV0dXJlLlxuICAgICAgaWYgKHNlbGYuX2xpbWl0ICYmIHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPiBzZWxmLl9saW1pdCkge1xuICAgICAgICAvLyBYWFggaW4gdGhlb3J5IHRoZSBzaXplIG9mIHB1Ymxpc2hlZCBpcyBubyBtb3JlIHRoYW4gbGltaXQrMVxuICAgICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLnNpemUoKSAhPT0gc2VsZi5fbGltaXQgKyAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQWZ0ZXIgYWRkaW5nIHRvIHB1Ymxpc2hlZCwgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAoc2VsZi5fcHVibGlzaGVkLnNpemUoKSAtIHNlbGYuX2xpbWl0KSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiIGRvY3VtZW50cyBhcmUgb3ZlcmZsb3dpbmcgdGhlIHNldFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvdmVyZmxvd2luZ0RvY0lkID0gc2VsZi5fcHVibGlzaGVkLm1heEVsZW1lbnRJZCgpO1xuICAgICAgICB2YXIgb3ZlcmZsb3dpbmdEb2MgPSBzZWxmLl9wdWJsaXNoZWQuZ2V0KG92ZXJmbG93aW5nRG9jSWQpO1xuXG4gICAgICAgIGlmIChFSlNPTi5lcXVhbHMob3ZlcmZsb3dpbmdEb2NJZCwgaWQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGRvY3VtZW50IGp1c3QgYWRkZWQgaXMgb3ZlcmZsb3dpbmcgdGhlIHB1Ymxpc2hlZCBzZXRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLl9wdWJsaXNoZWQucmVtb3ZlKG92ZXJmbG93aW5nRG9jSWQpO1xuICAgICAgICBzZWxmLl9tdWx0aXBsZXhlci5yZW1vdmVkKG92ZXJmbG93aW5nRG9jSWQpO1xuICAgICAgICBzZWxmLl9hZGRCdWZmZXJlZChvdmVyZmxvd2luZ0RvY0lkLCBvdmVyZmxvd2luZ0RvYyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIF9yZW1vdmVQdWJsaXNoZWQ6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9wdWJsaXNoZWQucmVtb3ZlKGlkKTtcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLnJlbW92ZWQoaWQpO1xuICAgICAgaWYgKCEgc2VsZi5fbGltaXQgfHwgc2VsZi5fcHVibGlzaGVkLnNpemUoKSA9PT0gc2VsZi5fbGltaXQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPiBzZWxmLl9saW1pdClcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJzZWxmLl9wdWJsaXNoZWQgZ290IHRvbyBiaWdcIik7XG5cbiAgICAgIC8vIE9LLCB3ZSBhcmUgcHVibGlzaGluZyBsZXNzIHRoYW4gdGhlIGxpbWl0LiBNYXliZSB3ZSBzaG91bGQgbG9vayBpbiB0aGVcbiAgICAgIC8vIGJ1ZmZlciB0byBmaW5kIHRoZSBuZXh0IGVsZW1lbnQgcGFzdCB3aGF0IHdlIHdlcmUgcHVibGlzaGluZyBiZWZvcmUuXG5cbiAgICAgIGlmICghc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZW1wdHkoKSkge1xuICAgICAgICAvLyBUaGVyZSdzIHNvbWV0aGluZyBpbiB0aGUgYnVmZmVyOyBtb3ZlIHRoZSBmaXJzdCB0aGluZyBpbiBpdCB0b1xuICAgICAgICAvLyBfcHVibGlzaGVkLlxuICAgICAgICB2YXIgbmV3RG9jSWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5taW5FbGVtZW50SWQoKTtcbiAgICAgICAgdmFyIG5ld0RvYyA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChuZXdEb2NJZCk7XG4gICAgICAgIHNlbGYuX3JlbW92ZUJ1ZmZlcmVkKG5ld0RvY0lkKTtcbiAgICAgICAgc2VsZi5fYWRkUHVibGlzaGVkKG5ld0RvY0lkLCBuZXdEb2MpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZXJlJ3Mgbm90aGluZyBpbiB0aGUgYnVmZmVyLiAgVGhpcyBjb3VsZCBtZWFuIG9uZSBvZiBhIGZldyB0aGluZ3MuXG5cbiAgICAgIC8vIChhKSBXZSBjb3VsZCBiZSBpbiB0aGUgbWlkZGxlIG9mIHJlLXJ1bm5pbmcgdGhlIHF1ZXJ5IChzcGVjaWZpY2FsbHksIHdlXG4gICAgICAvLyBjb3VsZCBiZSBpbiBfcHVibGlzaE5ld1Jlc3VsdHMpLiBJbiB0aGF0IGNhc2UsIF91bnB1Ymxpc2hlZEJ1ZmZlciBpc1xuICAgICAgLy8gZW1wdHkgYmVjYXVzZSB3ZSBjbGVhciBpdCBhdCB0aGUgYmVnaW5uaW5nIG9mIF9wdWJsaXNoTmV3UmVzdWx0cy4gSW5cbiAgICAgIC8vIHRoaXMgY2FzZSwgb3VyIGNhbGxlciBhbHJlYWR5IGtub3dzIHRoZSBlbnRpcmUgYW5zd2VyIHRvIHRoZSBxdWVyeSBhbmRcbiAgICAgIC8vIHdlIGRvbid0IG5lZWQgdG8gZG8gYW55dGhpbmcgZmFuY3kgaGVyZS4gIEp1c3QgcmV0dXJuLlxuICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5RVUVSWUlORylcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyAoYikgV2UncmUgcHJldHR5IGNvbmZpZGVudCB0aGF0IHRoZSB1bmlvbiBvZiBfcHVibGlzaGVkIGFuZFxuICAgICAgLy8gX3VucHVibGlzaGVkQnVmZmVyIGNvbnRhaW4gYWxsIGRvY3VtZW50cyB0aGF0IG1hdGNoIHNlbGVjdG9yLiBCZWNhdXNlXG4gICAgICAvLyBfdW5wdWJsaXNoZWRCdWZmZXIgaXMgZW1wdHksIHRoYXQgbWVhbnMgd2UncmUgY29uZmlkZW50IHRoYXQgX3B1Ymxpc2hlZFxuICAgICAgLy8gY29udGFpbnMgYWxsIGRvY3VtZW50cyB0aGF0IG1hdGNoIHNlbGVjdG9yLiBTbyB3ZSBoYXZlIG5vdGhpbmcgdG8gZG8uXG4gICAgICBpZiAoc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIChjKSBNYXliZSB0aGVyZSBhcmUgb3RoZXIgZG9jdW1lbnRzIG91dCB0aGVyZSB0aGF0IHNob3VsZCBiZSBpbiBvdXJcbiAgICAgIC8vIGJ1ZmZlci4gQnV0IGluIHRoYXQgY2FzZSwgd2hlbiB3ZSBlbXB0aWVkIF91bnB1Ymxpc2hlZEJ1ZmZlciBpblxuICAgICAgLy8gX3JlbW92ZUJ1ZmZlcmVkLCB3ZSBzaG91bGQgaGF2ZSBjYWxsZWQgX25lZWRUb1BvbGxRdWVyeSwgd2hpY2ggd2lsbFxuICAgICAgLy8gZWl0aGVyIHB1dCBzb21ldGhpbmcgaW4gX3VucHVibGlzaGVkQnVmZmVyIG9yIHNldCBfc2FmZUFwcGVuZFRvQnVmZmVyXG4gICAgICAvLyAob3IgYm90aCksIGFuZCBpdCB3aWxsIHB1dCB1cyBpbiBRVUVSWUlORyBmb3IgdGhhdCB3aG9sZSB0aW1lLiBTbyBpblxuICAgICAgLy8gZmFjdCwgd2Ugc2hvdWxkbid0IGJlIGFibGUgdG8gZ2V0IGhlcmUuXG5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkJ1ZmZlciBpbmV4cGxpY2FibHkgZW1wdHlcIik7XG4gICAgfSk7XG4gIH0sXG4gIF9jaGFuZ2VQdWJsaXNoZWQ6IGZ1bmN0aW9uIChpZCwgb2xkRG9jLCBuZXdEb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcHVibGlzaGVkLnNldChpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKG5ld0RvYykpO1xuICAgICAgdmFyIHByb2plY3RlZE5ldyA9IHNlbGYuX3Byb2plY3Rpb25GbihuZXdEb2MpO1xuICAgICAgdmFyIHByb2plY3RlZE9sZCA9IHNlbGYuX3Byb2plY3Rpb25GbihvbGREb2MpO1xuICAgICAgdmFyIGNoYW5nZWQgPSBEaWZmU2VxdWVuY2UubWFrZUNoYW5nZWRGaWVsZHMoXG4gICAgICAgIHByb2plY3RlZE5ldywgcHJvamVjdGVkT2xkKTtcbiAgICAgIGlmICghXy5pc0VtcHR5KGNoYW5nZWQpKVxuICAgICAgICBzZWxmLl9tdWx0aXBsZXhlci5jaGFuZ2VkKGlkLCBjaGFuZ2VkKTtcbiAgICB9KTtcbiAgfSxcbiAgX2FkZEJ1ZmZlcmVkOiBmdW5jdGlvbiAoaWQsIGRvYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25Gbihkb2MpKTtcblxuICAgICAgLy8gSWYgc29tZXRoaW5nIGlzIG92ZXJmbG93aW5nIHRoZSBidWZmZXIsIHdlIGp1c3QgcmVtb3ZlIGl0IGZyb20gY2FjaGVcbiAgICAgIGlmIChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPiBzZWxmLl9saW1pdCkge1xuICAgICAgICB2YXIgbWF4QnVmZmVyZWRJZCA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpO1xuXG4gICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShtYXhCdWZmZXJlZElkKTtcblxuICAgICAgICAvLyBTaW5jZSBzb21ldGhpbmcgbWF0Y2hpbmcgaXMgcmVtb3ZlZCBmcm9tIGNhY2hlIChib3RoIHB1Ymxpc2hlZCBzZXQgYW5kXG4gICAgICAgIC8vIGJ1ZmZlciksIHNldCBmbGFnIHRvIGZhbHNlXG4gICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvLyBJcyBjYWxsZWQgZWl0aGVyIHRvIHJlbW92ZSB0aGUgZG9jIGNvbXBsZXRlbHkgZnJvbSBtYXRjaGluZyBzZXQgb3IgdG8gbW92ZVxuICAvLyBpdCB0byB0aGUgcHVibGlzaGVkIHNldCBsYXRlci5cbiAgX3JlbW92ZUJ1ZmZlcmVkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIucmVtb3ZlKGlkKTtcbiAgICAgIC8vIFRvIGtlZXAgdGhlIGNvbnRyYWN0IFwiYnVmZmVyIGlzIG5ldmVyIGVtcHR5IGluIFNURUFEWSBwaGFzZSB1bmxlc3MgdGhlXG4gICAgICAvLyBldmVyeXRoaW5nIG1hdGNoaW5nIGZpdHMgaW50byBwdWJsaXNoZWRcIiB0cnVlLCB3ZSBwb2xsIGV2ZXJ5dGhpbmcgYXNcbiAgICAgIC8vIHNvb24gYXMgd2Ugc2VlIHRoZSBidWZmZXIgYmVjb21pbmcgZW1wdHkuXG4gICAgICBpZiAoISBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiYgISBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIpXG4gICAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgIH0pO1xuICB9LFxuICAvLyBDYWxsZWQgd2hlbiBhIGRvY3VtZW50IGhhcyBqb2luZWQgdGhlIFwiTWF0Y2hpbmdcIiByZXN1bHRzIHNldC5cbiAgLy8gVGFrZXMgcmVzcG9uc2liaWxpdHkgb2Yga2VlcGluZyBfdW5wdWJsaXNoZWRCdWZmZXIgaW4gc3luYyB3aXRoIF9wdWJsaXNoZWRcbiAgLy8gYW5kIHRoZSBlZmZlY3Qgb2YgbGltaXQgZW5mb3JjZWQuXG4gIF9hZGRNYXRjaGluZzogZnVuY3Rpb24gKGRvYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaWQgPSBkb2MuX2lkO1xuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpKVxuICAgICAgICB0aHJvdyBFcnJvcihcInRyaWVkIHRvIGFkZCBzb21ldGhpbmcgYWxyZWFkeSBwdWJsaXNoZWQgXCIgKyBpZCk7XG4gICAgICBpZiAoc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJ0cmllZCB0byBhZGQgc29tZXRoaW5nIGFscmVhZHkgZXhpc3RlZCBpbiBidWZmZXIgXCIgKyBpZCk7XG5cbiAgICAgIHZhciBsaW1pdCA9IHNlbGYuX2xpbWl0O1xuICAgICAgdmFyIGNvbXBhcmF0b3IgPSBzZWxmLl9jb21wYXJhdG9yO1xuICAgICAgdmFyIG1heFB1Ymxpc2hlZCA9IChsaW1pdCAmJiBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gMCkgP1xuICAgICAgICBzZWxmLl9wdWJsaXNoZWQuZ2V0KHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKSkgOiBudWxsO1xuICAgICAgdmFyIG1heEJ1ZmZlcmVkID0gKGxpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSA+IDApXG4gICAgICAgID8gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpKVxuICAgICAgICA6IG51bGw7XG4gICAgICAvLyBUaGUgcXVlcnkgaXMgdW5saW1pdGVkIG9yIGRpZG4ndCBwdWJsaXNoIGVub3VnaCBkb2N1bWVudHMgeWV0IG9yIHRoZVxuICAgICAgLy8gbmV3IGRvY3VtZW50IHdvdWxkIGZpdCBpbnRvIHB1Ymxpc2hlZCBzZXQgcHVzaGluZyB0aGUgbWF4aW11bSBlbGVtZW50XG4gICAgICAvLyBvdXQsIHRoZW4gd2UgbmVlZCB0byBwdWJsaXNoIHRoZSBkb2MuXG4gICAgICB2YXIgdG9QdWJsaXNoID0gISBsaW1pdCB8fCBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpIDwgbGltaXQgfHxcbiAgICAgICAgY29tcGFyYXRvcihkb2MsIG1heFB1Ymxpc2hlZCkgPCAwO1xuXG4gICAgICAvLyBPdGhlcndpc2Ugd2UgbWlnaHQgbmVlZCB0byBidWZmZXIgaXQgKG9ubHkgaW4gY2FzZSBvZiBsaW1pdGVkIHF1ZXJ5KS5cbiAgICAgIC8vIEJ1ZmZlcmluZyBpcyBhbGxvd2VkIGlmIHRoZSBidWZmZXIgaXMgbm90IGZpbGxlZCB1cCB5ZXQgYW5kIGFsbFxuICAgICAgLy8gbWF0Y2hpbmcgZG9jcyBhcmUgZWl0aGVyIGluIHRoZSBwdWJsaXNoZWQgc2V0IG9yIGluIHRoZSBidWZmZXIuXG4gICAgICB2YXIgY2FuQXBwZW5kVG9CdWZmZXIgPSAhdG9QdWJsaXNoICYmIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciAmJlxuICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPCBsaW1pdDtcblxuICAgICAgLy8gT3IgaWYgaXQgaXMgc21hbGwgZW5vdWdoIHRvIGJlIHNhZmVseSBpbnNlcnRlZCB0byB0aGUgbWlkZGxlIG9yIHRoZVxuICAgICAgLy8gYmVnaW5uaW5nIG9mIHRoZSBidWZmZXIuXG4gICAgICB2YXIgY2FuSW5zZXJ0SW50b0J1ZmZlciA9ICF0b1B1Ymxpc2ggJiYgbWF4QnVmZmVyZWQgJiZcbiAgICAgICAgY29tcGFyYXRvcihkb2MsIG1heEJ1ZmZlcmVkKSA8PSAwO1xuXG4gICAgICB2YXIgdG9CdWZmZXIgPSBjYW5BcHBlbmRUb0J1ZmZlciB8fCBjYW5JbnNlcnRJbnRvQnVmZmVyO1xuXG4gICAgICBpZiAodG9QdWJsaXNoKSB7XG4gICAgICAgIHNlbGYuX2FkZFB1Ymxpc2hlZChpZCwgZG9jKTtcbiAgICAgIH0gZWxzZSBpZiAodG9CdWZmZXIpIHtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQoaWQsIGRvYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkcm9wcGluZyBpdCBhbmQgbm90IHNhdmluZyB0byB0aGUgY2FjaGVcbiAgICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIC8vIENhbGxlZCB3aGVuIGEgZG9jdW1lbnQgbGVhdmVzIHRoZSBcIk1hdGNoaW5nXCIgcmVzdWx0cyBzZXQuXG4gIC8vIFRha2VzIHJlc3BvbnNpYmlsaXR5IG9mIGtlZXBpbmcgX3VucHVibGlzaGVkQnVmZmVyIGluIHN5bmMgd2l0aCBfcHVibGlzaGVkXG4gIC8vIGFuZCB0aGUgZWZmZWN0IG9mIGxpbWl0IGVuZm9yY2VkLlxuICBfcmVtb3ZlTWF0Y2hpbmc6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSAmJiAhIHNlbGYuX2xpbWl0KVxuICAgICAgICB0aHJvdyBFcnJvcihcInRyaWVkIHRvIHJlbW92ZSBzb21ldGhpbmcgbWF0Y2hpbmcgYnV0IG5vdCBjYWNoZWQgXCIgKyBpZCk7XG5cbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSkge1xuICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgfSBlbHNlIGlmIChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpKSB7XG4gICAgICAgIHNlbGYuX3JlbW92ZUJ1ZmZlcmVkKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX2hhbmRsZURvYzogZnVuY3Rpb24gKGlkLCBuZXdEb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1hdGNoZXNOb3cgPSBuZXdEb2MgJiYgc2VsZi5fbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMobmV3RG9jKS5yZXN1bHQ7XG5cbiAgICAgIHZhciBwdWJsaXNoZWRCZWZvcmUgPSBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKTtcbiAgICAgIHZhciBidWZmZXJlZEJlZm9yZSA9IHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCk7XG4gICAgICB2YXIgY2FjaGVkQmVmb3JlID0gcHVibGlzaGVkQmVmb3JlIHx8IGJ1ZmZlcmVkQmVmb3JlO1xuXG4gICAgICBpZiAobWF0Y2hlc05vdyAmJiAhY2FjaGVkQmVmb3JlKSB7XG4gICAgICAgIHNlbGYuX2FkZE1hdGNoaW5nKG5ld0RvYyk7XG4gICAgICB9IGVsc2UgaWYgKGNhY2hlZEJlZm9yZSAmJiAhbWF0Y2hlc05vdykge1xuICAgICAgICBzZWxmLl9yZW1vdmVNYXRjaGluZyhpZCk7XG4gICAgICB9IGVsc2UgaWYgKGNhY2hlZEJlZm9yZSAmJiBtYXRjaGVzTm93KSB7XG4gICAgICAgIHZhciBvbGREb2MgPSBzZWxmLl9wdWJsaXNoZWQuZ2V0KGlkKTtcbiAgICAgICAgdmFyIGNvbXBhcmF0b3IgPSBzZWxmLl9jb21wYXJhdG9yO1xuICAgICAgICB2YXIgbWluQnVmZmVyZWQgPSBzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiZcbiAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWluRWxlbWVudElkKCkpO1xuICAgICAgICB2YXIgbWF4QnVmZmVyZWQ7XG5cbiAgICAgICAgaWYgKHB1Ymxpc2hlZEJlZm9yZSkge1xuICAgICAgICAgIC8vIFVubGltaXRlZCBjYXNlIHdoZXJlIHRoZSBkb2N1bWVudCBzdGF5cyBpbiBwdWJsaXNoZWQgb25jZSBpdFxuICAgICAgICAgIC8vIG1hdGNoZXMgb3IgdGhlIGNhc2Ugd2hlbiB3ZSBkb24ndCBoYXZlIGVub3VnaCBtYXRjaGluZyBkb2NzIHRvXG4gICAgICAgICAgLy8gcHVibGlzaCBvciB0aGUgY2hhbmdlZCBidXQgbWF0Y2hpbmcgZG9jIHdpbGwgc3RheSBpbiBwdWJsaXNoZWRcbiAgICAgICAgICAvLyBhbnl3YXlzLlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gWFhYOiBXZSByZWx5IG9uIHRoZSBlbXB0aW5lc3Mgb2YgYnVmZmVyLiBCZSBzdXJlIHRvIG1haW50YWluIHRoZVxuICAgICAgICAgIC8vIGZhY3QgdGhhdCBidWZmZXIgY2FuJ3QgYmUgZW1wdHkgaWYgdGhlcmUgYXJlIG1hdGNoaW5nIGRvY3VtZW50cyBub3RcbiAgICAgICAgICAvLyBwdWJsaXNoZWQuIE5vdGFibHksIHdlIGRvbid0IHdhbnQgdG8gc2NoZWR1bGUgcmVwb2xsIGFuZCBjb250aW51ZVxuICAgICAgICAgIC8vIHJlbHlpbmcgb24gdGhpcyBwcm9wZXJ0eS5cbiAgICAgICAgICB2YXIgc3RheXNJblB1Ymxpc2hlZCA9ICEgc2VsZi5fbGltaXQgfHxcbiAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSA9PT0gMCB8fFxuICAgICAgICAgICAgY29tcGFyYXRvcihuZXdEb2MsIG1pbkJ1ZmZlcmVkKSA8PSAwO1xuXG4gICAgICAgICAgaWYgKHN0YXlzSW5QdWJsaXNoZWQpIHtcbiAgICAgICAgICAgIHNlbGYuX2NoYW5nZVB1Ymxpc2hlZChpZCwgb2xkRG9jLCBuZXdEb2MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBhZnRlciB0aGUgY2hhbmdlIGRvYyBkb2Vzbid0IHN0YXkgaW4gdGhlIHB1Ymxpc2hlZCwgcmVtb3ZlIGl0XG4gICAgICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgICAgICAgLy8gYnV0IGl0IGNhbiBtb3ZlIGludG8gYnVmZmVyZWQgbm93LCBjaGVjayBpdFxuICAgICAgICAgICAgbWF4QnVmZmVyZWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoXG4gICAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpKTtcblxuICAgICAgICAgICAgdmFyIHRvQnVmZmVyID0gc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyIHx8XG4gICAgICAgICAgICAgICAgICAobWF4QnVmZmVyZWQgJiYgY29tcGFyYXRvcihuZXdEb2MsIG1heEJ1ZmZlcmVkKSA8PSAwKTtcblxuICAgICAgICAgICAgaWYgKHRvQnVmZmVyKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKGlkLCBuZXdEb2MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gVGhyb3cgYXdheSBmcm9tIGJvdGggcHVibGlzaGVkIHNldCBhbmQgYnVmZmVyXG4gICAgICAgICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChidWZmZXJlZEJlZm9yZSkge1xuICAgICAgICAgIG9sZERvYyA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChpZCk7XG4gICAgICAgICAgLy8gcmVtb3ZlIHRoZSBvbGQgdmVyc2lvbiBtYW51YWxseSBpbnN0ZWFkIG9mIHVzaW5nIF9yZW1vdmVCdWZmZXJlZCBzb1xuICAgICAgICAgIC8vIHdlIGRvbid0IHRyaWdnZXIgdGhlIHF1ZXJ5aW5nIGltbWVkaWF0ZWx5LiAgaWYgd2UgZW5kIHRoaXMgYmxvY2tcbiAgICAgICAgICAvLyB3aXRoIHRoZSBidWZmZXIgZW1wdHksIHdlIHdpbGwgbmVlZCB0byB0cmlnZ2VyIHRoZSBxdWVyeSBwb2xsXG4gICAgICAgICAgLy8gbWFudWFsbHkgdG9vLlxuICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShpZCk7XG5cbiAgICAgICAgICB2YXIgbWF4UHVibGlzaGVkID0gc2VsZi5fcHVibGlzaGVkLmdldChcbiAgICAgICAgICAgIHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKSk7XG4gICAgICAgICAgbWF4QnVmZmVyZWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiZcbiAgICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoXG4gICAgICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKSk7XG5cbiAgICAgICAgICAvLyB0aGUgYnVmZmVyZWQgZG9jIHdhcyB1cGRhdGVkLCBpdCBjb3VsZCBtb3ZlIHRvIHB1Ymxpc2hlZFxuICAgICAgICAgIHZhciB0b1B1Ymxpc2ggPSBjb21wYXJhdG9yKG5ld0RvYywgbWF4UHVibGlzaGVkKSA8IDA7XG5cbiAgICAgICAgICAvLyBvciBzdGF5cyBpbiBidWZmZXIgZXZlbiBhZnRlciB0aGUgY2hhbmdlXG4gICAgICAgICAgdmFyIHN0YXlzSW5CdWZmZXIgPSAoISB0b1B1Ymxpc2ggJiYgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyKSB8fFxuICAgICAgICAgICAgICAgICghdG9QdWJsaXNoICYmIG1heEJ1ZmZlcmVkICYmXG4gICAgICAgICAgICAgICAgIGNvbXBhcmF0b3IobmV3RG9jLCBtYXhCdWZmZXJlZCkgPD0gMCk7XG5cbiAgICAgICAgICBpZiAodG9QdWJsaXNoKSB7XG4gICAgICAgICAgICBzZWxmLl9hZGRQdWJsaXNoZWQoaWQsIG5ld0RvYyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF5c0luQnVmZmVyKSB7XG4gICAgICAgICAgICAvLyBzdGF5cyBpbiBidWZmZXIgYnV0IGNoYW5nZXNcbiAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNldChpZCwgbmV3RG9jKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVGhyb3cgYXdheSBmcm9tIGJvdGggcHVibGlzaGVkIHNldCBhbmQgYnVmZmVyXG4gICAgICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIE5vcm1hbGx5IHRoaXMgY2hlY2sgd291bGQgaGF2ZSBiZWVuIGRvbmUgaW4gX3JlbW92ZUJ1ZmZlcmVkIGJ1dFxuICAgICAgICAgICAgLy8gd2UgZGlkbid0IHVzZSBpdCwgc28gd2UgbmVlZCB0byBkbyBpdCBvdXJzZWxmIG5vdy5cbiAgICAgICAgICAgIGlmICghIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSkge1xuICAgICAgICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2FjaGVkQmVmb3JlIGltcGxpZXMgZWl0aGVyIG9mIHB1Ymxpc2hlZEJlZm9yZSBvciBidWZmZXJlZEJlZm9yZSBpcyB0cnVlLlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfZmV0Y2hNb2RpZmllZERvY3VtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLkZFVENISU5HKTtcbiAgICAgIC8vIERlZmVyLCBiZWNhdXNlIG5vdGhpbmcgY2FsbGVkIGZyb20gdGhlIG9wbG9nIGVudHJ5IGhhbmRsZXIgbWF5IHlpZWxkLFxuICAgICAgLy8gYnV0IGZldGNoKCkgeWllbGRzLlxuICAgICAgTWV0ZW9yLmRlZmVyKGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2hpbGUgKCFzZWxmLl9zdG9wcGVkICYmICFzZWxmLl9uZWVkVG9GZXRjaC5lbXB0eSgpKSB7XG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5RVUVSWUlORykge1xuICAgICAgICAgICAgLy8gV2hpbGUgZmV0Y2hpbmcsIHdlIGRlY2lkZWQgdG8gZ28gaW50byBRVUVSWUlORyBtb2RlLCBhbmQgdGhlbiB3ZVxuICAgICAgICAgICAgLy8gc2F3IGFub3RoZXIgb3Bsb2cgZW50cnksIHNvIF9uZWVkVG9GZXRjaCBpcyBub3QgZW1wdHkuIEJ1dCB3ZVxuICAgICAgICAgICAgLy8gc2hvdWxkbid0IGZldGNoIHRoZXNlIGRvY3VtZW50cyB1bnRpbCBBRlRFUiB0aGUgcXVlcnkgaXMgZG9uZS5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEJlaW5nIGluIHN0ZWFkeSBwaGFzZSBoZXJlIHdvdWxkIGJlIHN1cnByaXNpbmcuXG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlICE9PSBQSEFTRS5GRVRDSElORylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInBoYXNlIGluIGZldGNoTW9kaWZpZWREb2N1bWVudHM6IFwiICsgc2VsZi5fcGhhc2UpO1xuXG4gICAgICAgICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBzZWxmLl9uZWVkVG9GZXRjaDtcbiAgICAgICAgICB2YXIgdGhpc0dlbmVyYXRpb24gPSArK3NlbGYuX2ZldGNoR2VuZXJhdGlvbjtcbiAgICAgICAgICBzZWxmLl9uZWVkVG9GZXRjaCA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgICAgICAgIHZhciB3YWl0aW5nID0gMDtcbiAgICAgICAgICB2YXIgZnV0ID0gbmV3IEZ1dHVyZTtcbiAgICAgICAgICAvLyBUaGlzIGxvb3AgaXMgc2FmZSwgYmVjYXVzZSBfY3VycmVudGx5RmV0Y2hpbmcgd2lsbCBub3QgYmUgdXBkYXRlZFxuICAgICAgICAgIC8vIGR1cmluZyB0aGlzIGxvb3AgKGluIGZhY3QsIGl0IGlzIG5ldmVyIG11dGF0ZWQpLlxuICAgICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nLmZvckVhY2goZnVuY3Rpb24gKGNhY2hlS2V5LCBpZCkge1xuICAgICAgICAgICAgd2FpdGluZysrO1xuICAgICAgICAgICAgc2VsZi5fbW9uZ29IYW5kbGUuX2RvY0ZldGNoZXIuZmV0Y2goXG4gICAgICAgICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lLCBpZCwgY2FjaGVLZXksXG4gICAgICAgICAgICAgIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uIChlcnIsIGRvYykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIGZldGNoaW5nIGRvY3VtZW50czogXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycik7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIGdldCBhbiBlcnJvciBmcm9tIHRoZSBmZXRjaGVyIChlZywgdHJvdWJsZVxuICAgICAgICAgICAgICAgICAgICAvLyBjb25uZWN0aW5nIHRvIE1vbmdvKSwgbGV0J3MganVzdCBhYmFuZG9uIHRoZSBmZXRjaCBwaGFzZVxuICAgICAgICAgICAgICAgICAgICAvLyBhbHRvZ2V0aGVyIGFuZCBmYWxsIGJhY2sgdG8gcG9sbGluZy4gSXQncyBub3QgbGlrZSB3ZSdyZVxuICAgICAgICAgICAgICAgICAgICAvLyBnZXR0aW5nIGxpdmUgdXBkYXRlcyBhbnl3YXkuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghc2VsZi5fc3RvcHBlZCAmJiBzZWxmLl9waGFzZSA9PT0gUEhBU0UuRkVUQ0hJTkdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgc2VsZi5fZmV0Y2hHZW5lcmF0aW9uID09PSB0aGlzR2VuZXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSByZS1jaGVjayB0aGUgZ2VuZXJhdGlvbiBpbiBjYXNlIHdlJ3ZlIGhhZCBhbiBleHBsaWNpdFxuICAgICAgICAgICAgICAgICAgICAvLyBfcG9sbFF1ZXJ5IGNhbGwgKGVnLCBpbiBhbm90aGVyIGZpYmVyKSB3aGljaCBzaG91bGRcbiAgICAgICAgICAgICAgICAgICAgLy8gZWZmZWN0aXZlbHkgY2FuY2VsIHRoaXMgcm91bmQgb2YgZmV0Y2hlcy4gIChfcG9sbFF1ZXJ5XG4gICAgICAgICAgICAgICAgICAgIC8vIGluY3JlbWVudHMgdGhlIGdlbmVyYXRpb24uKVxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIGRvYyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICAgIHdhaXRpbmctLTtcbiAgICAgICAgICAgICAgICAgIC8vIEJlY2F1c2UgZmV0Y2goKSBuZXZlciBjYWxscyBpdHMgY2FsbGJhY2sgc3luY2hyb25vdXNseSxcbiAgICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgc2FmZSAoaWUsIHdlIHdvbid0IGNhbGwgZnV0LnJldHVybigpIGJlZm9yZSB0aGVcbiAgICAgICAgICAgICAgICAgIC8vIGZvckVhY2ggaXMgZG9uZSkuXG4gICAgICAgICAgICAgICAgICBpZiAod2FpdGluZyA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgZnV0LnJldHVybigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGZ1dC53YWl0KCk7XG4gICAgICAgICAgLy8gRXhpdCBub3cgaWYgd2UndmUgaGFkIGEgX3BvbGxRdWVyeSBjYWxsIChoZXJlIG9yIGluIGFub3RoZXIgZmliZXIpLlxuICAgICAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlJ3JlIGRvbmUgZmV0Y2hpbmcsIHNvIHdlIGNhbiBiZSBzdGVhZHksIHVubGVzcyB3ZSd2ZSBoYWQgYVxuICAgICAgICAvLyBfcG9sbFF1ZXJ5IGNhbGwgKGhlcmUgb3IgaW4gYW5vdGhlciBmaWJlcikuXG4gICAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICAgICAgc2VsZi5fYmVTdGVhZHkoKTtcbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgfSxcbiAgX2JlU3RlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuU1RFQURZKTtcbiAgICAgIHZhciB3cml0ZXMgPSBzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5O1xuICAgICAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IFtdO1xuICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIub25GbHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIF8uZWFjaCh3cml0ZXMsIGZ1bmN0aW9uICh3KSB7XG4gICAgICAgICAgdy5jb21taXR0ZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcbiAgX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZzogZnVuY3Rpb24gKG9wKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZEZvck9wKG9wKSwgb3AudHMudG9TdHJpbmcoKSk7XG4gICAgfSk7XG4gIH0sXG4gIF9oYW5kbGVPcGxvZ0VudHJ5U3RlYWR5T3JGZXRjaGluZzogZnVuY3Rpb24gKG9wKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBpZCA9IGlkRm9yT3Aob3ApO1xuICAgICAgLy8gSWYgd2UncmUgYWxyZWFkeSBmZXRjaGluZyB0aGlzIG9uZSwgb3IgYWJvdXQgdG8sIHdlIGNhbid0IG9wdGltaXplO1xuICAgICAgLy8gbWFrZSBzdXJlIHRoYXQgd2UgZmV0Y2ggaXQgYWdhaW4gaWYgbmVjZXNzYXJ5LlxuICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5GRVRDSElORyAmJlxuICAgICAgICAgICgoc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgJiYgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcuaGFzKGlkKSkgfHxcbiAgICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guaGFzKGlkKSkpIHtcbiAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guc2V0KGlkLCBvcC50cy50b1N0cmluZygpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAob3Aub3AgPT09ICdkJykge1xuICAgICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkgfHxcbiAgICAgICAgICAgIChzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpKSlcbiAgICAgICAgICBzZWxmLl9yZW1vdmVNYXRjaGluZyhpZCk7XG4gICAgICB9IGVsc2UgaWYgKG9wLm9wID09PSAnaScpIHtcbiAgICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImluc2VydCBmb3VuZCBmb3IgYWxyZWFkeS1leGlzdGluZyBJRCBpbiBwdWJsaXNoZWRcIik7XG4gICAgICAgIGlmIChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImluc2VydCBmb3VuZCBmb3IgYWxyZWFkeS1leGlzdGluZyBJRCBpbiBidWZmZXJcIik7XG5cbiAgICAgICAgLy8gWFhYIHdoYXQgaWYgc2VsZWN0b3IgeWllbGRzPyAgZm9yIG5vdyBpdCBjYW4ndCBidXQgbGF0ZXIgaXQgY291bGRcbiAgICAgICAgLy8gaGF2ZSAkd2hlcmVcbiAgICAgICAgaWYgKHNlbGYuX21hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKG9wLm8pLnJlc3VsdClcbiAgICAgICAgICBzZWxmLl9hZGRNYXRjaGluZyhvcC5vKTtcbiAgICAgIH0gZWxzZSBpZiAob3Aub3AgPT09ICd1Jykge1xuICAgICAgICAvLyBJcyB0aGlzIGEgbW9kaWZpZXIgKCRzZXQvJHVuc2V0LCB3aGljaCBtYXkgcmVxdWlyZSB1cyB0byBwb2xsIHRoZVxuICAgICAgICAvLyBkYXRhYmFzZSB0byBmaWd1cmUgb3V0IGlmIHRoZSB3aG9sZSBkb2N1bWVudCBtYXRjaGVzIHRoZSBzZWxlY3Rvcikgb3JcbiAgICAgICAgLy8gYSByZXBsYWNlbWVudCAoaW4gd2hpY2ggY2FzZSB3ZSBjYW4ganVzdCBkaXJlY3RseSByZS1ldmFsdWF0ZSB0aGVcbiAgICAgICAgLy8gc2VsZWN0b3IpP1xuICAgICAgICB2YXIgaXNSZXBsYWNlID0gIV8uaGFzKG9wLm8sICckc2V0JykgJiYgIV8uaGFzKG9wLm8sICckdW5zZXQnKTtcbiAgICAgICAgLy8gSWYgdGhpcyBtb2RpZmllciBtb2RpZmllcyBzb21ldGhpbmcgaW5zaWRlIGFuIEVKU09OIGN1c3RvbSB0eXBlIChpZSxcbiAgICAgICAgLy8gYW55dGhpbmcgd2l0aCBFSlNPTiQpLCB0aGVuIHdlIGNhbid0IHRyeSB0byB1c2VcbiAgICAgICAgLy8gTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnksIHNpbmNlIHRoYXQganVzdCBtdXRhdGVzIHRoZSBFSlNPTiBlbmNvZGluZyxcbiAgICAgICAgLy8gbm90IHRoZSBhY3R1YWwgb2JqZWN0LlxuICAgICAgICB2YXIgY2FuRGlyZWN0bHlNb2RpZnlEb2MgPVxuICAgICAgICAgICFpc1JlcGxhY2UgJiYgbW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZChvcC5vKTtcblxuICAgICAgICB2YXIgcHVibGlzaGVkQmVmb3JlID0gc2VsZi5fcHVibGlzaGVkLmhhcyhpZCk7XG4gICAgICAgIHZhciBidWZmZXJlZEJlZm9yZSA9IHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCk7XG5cbiAgICAgICAgaWYgKGlzUmVwbGFjZSkge1xuICAgICAgICAgIHNlbGYuX2hhbmRsZURvYyhpZCwgXy5leHRlbmQoe19pZDogaWR9LCBvcC5vKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoKHB1Ymxpc2hlZEJlZm9yZSB8fCBidWZmZXJlZEJlZm9yZSkgJiZcbiAgICAgICAgICAgICAgICAgICBjYW5EaXJlY3RseU1vZGlmeURvYykge1xuICAgICAgICAgIC8vIE9oIGdyZWF0LCB3ZSBhY3R1YWxseSBrbm93IHdoYXQgdGhlIGRvY3VtZW50IGlzLCBzbyB3ZSBjYW4gYXBwbHlcbiAgICAgICAgICAvLyB0aGlzIGRpcmVjdGx5LlxuICAgICAgICAgIHZhciBuZXdEb2MgPSBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKVxuICAgICAgICAgICAgPyBzZWxmLl9wdWJsaXNoZWQuZ2V0KGlkKSA6IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChpZCk7XG4gICAgICAgICAgbmV3RG9jID0gRUpTT04uY2xvbmUobmV3RG9jKTtcblxuICAgICAgICAgIG5ld0RvYy5faWQgPSBpZDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkobmV3RG9jLCBvcC5vKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5uYW1lICE9PSBcIk1pbmltb25nb0Vycm9yXCIpXG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAvLyBXZSBkaWRuJ3QgdW5kZXJzdGFuZCB0aGUgbW9kaWZpZXIuICBSZS1mZXRjaC5cbiAgICAgICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZCwgb3AudHMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSkge1xuICAgICAgICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHNlbGYuX2hhbmRsZURvYyhpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKG5ld0RvYykpO1xuICAgICAgICB9IGVsc2UgaWYgKCFjYW5EaXJlY3RseU1vZGlmeURvYyB8fFxuICAgICAgICAgICAgICAgICAgIHNlbGYuX21hdGNoZXIuY2FuQmVjb21lVHJ1ZUJ5TW9kaWZpZXIob3AubykgfHxcbiAgICAgICAgICAgICAgICAgICAoc2VsZi5fc29ydGVyICYmIHNlbGYuX3NvcnRlci5hZmZlY3RlZEJ5TW9kaWZpZXIob3AubykpKSB7XG4gICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guc2V0KGlkLCBvcC50cy50b1N0cmluZygpKTtcbiAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSlcbiAgICAgICAgICAgIHNlbGYuX2ZldGNoTW9kaWZpZWREb2N1bWVudHMoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJYWFggU1VSUFJJU0lORyBPUEVSQVRJT046IFwiICsgb3ApO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvLyBZaWVsZHMhXG4gIF9ydW5Jbml0aWFsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJvcGxvZyBzdG9wcGVkIHN1cnByaXNpbmdseSBlYXJseVwiKTtcblxuICAgIHNlbGYuX3J1blF1ZXJ5KHtpbml0aWFsOiB0cnVlfSk7ICAvLyB5aWVsZHNcblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuOyAgLy8gY2FuIGhhcHBlbiBvbiBxdWVyeUVycm9yXG5cbiAgICAvLyBBbGxvdyBvYnNlcnZlQ2hhbmdlcyBjYWxscyB0byByZXR1cm4uIChBZnRlciB0aGlzLCBpdCdzIHBvc3NpYmxlIGZvclxuICAgIC8vIHN0b3AoKSB0byBiZSBjYWxsZWQuKVxuICAgIHNlbGYuX211bHRpcGxleGVyLnJlYWR5KCk7XG5cbiAgICBzZWxmLl9kb25lUXVlcnlpbmcoKTsgIC8vIHlpZWxkc1xuICB9LFxuXG4gIC8vIEluIHZhcmlvdXMgY2lyY3Vtc3RhbmNlcywgd2UgbWF5IGp1c3Qgd2FudCB0byBzdG9wIHByb2Nlc3NpbmcgdGhlIG9wbG9nIGFuZFxuICAvLyByZS1ydW4gdGhlIGluaXRpYWwgcXVlcnksIGp1c3QgYXMgaWYgd2Ugd2VyZSBhIFBvbGxpbmdPYnNlcnZlRHJpdmVyLlxuICAvL1xuICAvLyBUaGlzIGZ1bmN0aW9uIG1heSBub3QgYmxvY2ssIGJlY2F1c2UgaXQgaXMgY2FsbGVkIGZyb20gYW4gb3Bsb2cgZW50cnlcbiAgLy8gaGFuZGxlci5cbiAgLy9cbiAgLy8gWFhYIFdlIHNob3VsZCBjYWxsIHRoaXMgd2hlbiB3ZSBkZXRlY3QgdGhhdCB3ZSd2ZSBiZWVuIGluIEZFVENISU5HIGZvciBcInRvb1xuICAvLyBsb25nXCIuXG4gIC8vXG4gIC8vIFhYWCBXZSBzaG91bGQgY2FsbCB0aGlzIHdoZW4gd2UgZGV0ZWN0IE1vbmdvIGZhaWxvdmVyIChzaW5jZSB0aGF0IG1pZ2h0XG4gIC8vIG1lYW4gdGhhdCBzb21lIG9mIHRoZSBvcGxvZyBlbnRyaWVzIHdlIGhhdmUgcHJvY2Vzc2VkIGhhdmUgYmVlbiByb2xsZWRcbiAgLy8gYmFjaykuIFRoZSBOb2RlIE1vbmdvIGRyaXZlciBpcyBpbiB0aGUgbWlkZGxlIG9mIGEgYnVuY2ggb2YgaHVnZVxuICAvLyByZWZhY3RvcmluZ3MsIGluY2x1ZGluZyB0aGUgd2F5IHRoYXQgaXQgbm90aWZpZXMgeW91IHdoZW4gcHJpbWFyeVxuICAvLyBjaGFuZ2VzLiBXaWxsIHB1dCBvZmYgaW1wbGVtZW50aW5nIHRoaXMgdW50aWwgZHJpdmVyIDEuNCBpcyBvdXQuXG4gIF9wb2xsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gWWF5LCB3ZSBnZXQgdG8gZm9yZ2V0IGFib3V0IGFsbCB0aGUgdGhpbmdzIHdlIHRob3VnaHQgd2UgaGFkIHRvIGZldGNoLlxuICAgICAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgICAgICsrc2VsZi5fZmV0Y2hHZW5lcmF0aW9uOyAgLy8gaWdub3JlIGFueSBpbi1mbGlnaHQgZmV0Y2hlc1xuICAgICAgc2VsZi5fcmVnaXN0ZXJQaGFzZUNoYW5nZShQSEFTRS5RVUVSWUlORyk7XG5cbiAgICAgIC8vIERlZmVyIHNvIHRoYXQgd2UgZG9uJ3QgeWllbGQuICBXZSBkb24ndCBuZWVkIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5XG4gICAgICAvLyBoZXJlIGJlY2F1c2UgU3dpdGNoZWRUb1F1ZXJ5IGlzIG5vdCB0aHJvd24gaW4gUVVFUllJTkcgbW9kZS5cbiAgICAgIE1ldGVvci5kZWZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuX3J1blF1ZXJ5KCk7XG4gICAgICAgIHNlbGYuX2RvbmVRdWVyeWluZygpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gWWllbGRzIVxuICBfcnVuUXVlcnk6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBuZXdSZXN1bHRzLCBuZXdCdWZmZXI7XG5cbiAgICAvLyBUaGlzIHdoaWxlIGxvb3AgaXMganVzdCB0byByZXRyeSBmYWlsdXJlcy5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgLy8gSWYgd2UndmUgYmVlbiBzdG9wcGVkLCB3ZSBkb24ndCBoYXZlIHRvIHJ1biBhbnl0aGluZyBhbnkgbW9yZS5cbiAgICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIG5ld1Jlc3VsdHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIG5ld0J1ZmZlciA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuXG4gICAgICAvLyBRdWVyeSAyeCBkb2N1bWVudHMgYXMgdGhlIGhhbGYgZXhjbHVkZWQgZnJvbSB0aGUgb3JpZ2luYWwgcXVlcnkgd2lsbCBnb1xuICAgICAgLy8gaW50byB1bnB1Ymxpc2hlZCBidWZmZXIgdG8gcmVkdWNlIGFkZGl0aW9uYWwgTW9uZ28gbG9va3VwcyBpbiBjYXNlc1xuICAgICAgLy8gd2hlbiBkb2N1bWVudHMgYXJlIHJlbW92ZWQgZnJvbSB0aGUgcHVibGlzaGVkIHNldCBhbmQgbmVlZCBhXG4gICAgICAvLyByZXBsYWNlbWVudC5cbiAgICAgIC8vIFhYWCBuZWVkcyBtb3JlIHRob3VnaHQgb24gbm9uLXplcm8gc2tpcFxuICAgICAgLy8gWFhYIDIgaXMgYSBcIm1hZ2ljIG51bWJlclwiIG1lYW5pbmcgdGhlcmUgaXMgYW4gZXh0cmEgY2h1bmsgb2YgZG9jcyBmb3JcbiAgICAgIC8vIGJ1ZmZlciBpZiBzdWNoIGlzIG5lZWRlZC5cbiAgICAgIHZhciBjdXJzb3IgPSBzZWxmLl9jdXJzb3JGb3JRdWVyeSh7IGxpbWl0OiBzZWxmLl9saW1pdCAqIDIgfSk7XG4gICAgICB0cnkge1xuICAgICAgICBjdXJzb3IuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpKSB7ICAvLyB5aWVsZHNcbiAgICAgICAgICBpZiAoIXNlbGYuX2xpbWl0IHx8IGkgPCBzZWxmLl9saW1pdCkge1xuICAgICAgICAgICAgbmV3UmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3QnVmZmVyLnNldChkb2MuX2lkLCBkb2MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAob3B0aW9ucy5pbml0aWFsICYmIHR5cGVvZihlLmNvZGUpID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIC8vIFRoaXMgaXMgYW4gZXJyb3IgZG9jdW1lbnQgc2VudCB0byB1cyBieSBtb25nb2QsIG5vdCBhIGNvbm5lY3Rpb25cbiAgICAgICAgICAvLyBlcnJvciBnZW5lcmF0ZWQgYnkgdGhlIGNsaWVudC4gQW5kIHdlJ3ZlIG5ldmVyIHNlZW4gdGhpcyBxdWVyeSB3b3JrXG4gICAgICAgICAgLy8gc3VjY2Vzc2Z1bGx5LiBQcm9iYWJseSBpdCdzIGEgYmFkIHNlbGVjdG9yIG9yIHNvbWV0aGluZywgc28gd2VcbiAgICAgICAgICAvLyBzaG91bGQgTk9UIHJldHJ5LiBJbnN0ZWFkLCB3ZSBzaG91bGQgaGFsdCB0aGUgb2JzZXJ2ZSAod2hpY2ggZW5kc1xuICAgICAgICAgIC8vIHVwIGNhbGxpbmcgYHN0b3BgIG9uIHVzKS5cbiAgICAgICAgICBzZWxmLl9tdWx0aXBsZXhlci5xdWVyeUVycm9yKGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIER1cmluZyBmYWlsb3ZlciAoZWcpIGlmIHdlIGdldCBhbiBleGNlcHRpb24gd2Ugc2hvdWxkIGxvZyBhbmQgcmV0cnlcbiAgICAgICAgLy8gaW5zdGVhZCBvZiBjcmFzaGluZy5cbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIkdvdCBleGNlcHRpb24gd2hpbGUgcG9sbGluZyBxdWVyeTogXCIgKyBlKTtcbiAgICAgICAgTWV0ZW9yLl9zbGVlcEZvck1zKDEwMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG5cbiAgICBzZWxmLl9wdWJsaXNoTmV3UmVzdWx0cyhuZXdSZXN1bHRzLCBuZXdCdWZmZXIpO1xuICB9LFxuXG4gIC8vIFRyYW5zaXRpb25zIHRvIFFVRVJZSU5HIGFuZCBydW5zIGFub3RoZXIgcXVlcnksIG9yIChpZiBhbHJlYWR5IGluIFFVRVJZSU5HKVxuICAvLyBlbnN1cmVzIHRoYXQgd2Ugd2lsbCBxdWVyeSBhZ2FpbiBsYXRlci5cbiAgLy9cbiAgLy8gVGhpcyBmdW5jdGlvbiBtYXkgbm90IGJsb2NrLCBiZWNhdXNlIGl0IGlzIGNhbGxlZCBmcm9tIGFuIG9wbG9nIGVudHJ5XG4gIC8vIGhhbmRsZXIuIEhvd2V2ZXIsIGlmIHdlIHdlcmUgbm90IGFscmVhZHkgaW4gdGhlIFFVRVJZSU5HIHBoYXNlLCBpdCB0aHJvd3NcbiAgLy8gYW4gZXhjZXB0aW9uIHRoYXQgaXMgY2F1Z2h0IGJ5IHRoZSBjbG9zZXN0IHN1cnJvdW5kaW5nXG4gIC8vIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5IGNhbGw7IHRoaXMgZW5zdXJlcyB0aGF0IHdlIGRvbid0IGNvbnRpbnVlIHJ1bm5pbmdcbiAgLy8gY2xvc2UgdGhhdCB3YXMgZGVzaWduZWQgZm9yIGFub3RoZXIgcGhhc2UgaW5zaWRlIFBIQVNFLlFVRVJZSU5HLlxuICAvL1xuICAvLyAoSXQncyBhbHNvIG5lY2Vzc2FyeSB3aGVuZXZlciBsb2dpYyBpbiB0aGlzIGZpbGUgeWllbGRzIHRvIGNoZWNrIHRoYXQgb3RoZXJcbiAgLy8gcGhhc2VzIGhhdmVuJ3QgcHV0IHVzIGludG8gUVVFUllJTkcgbW9kZSwgdGhvdWdoOyBlZyxcbiAgLy8gX2ZldGNoTW9kaWZpZWREb2N1bWVudHMgZG9lcyB0aGlzLilcbiAgX25lZWRUb1BvbGxRdWVyeTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyBJZiB3ZSdyZSBub3QgYWxyZWFkeSBpbiB0aGUgbWlkZGxlIG9mIGEgcXVlcnksIHdlIGNhbiBxdWVyeSBub3dcbiAgICAgIC8vIChwb3NzaWJseSBwYXVzaW5nIEZFVENISU5HKS5cbiAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgc2VsZi5fcG9sbFF1ZXJ5KCk7XG4gICAgICAgIHRocm93IG5ldyBTd2l0Y2hlZFRvUXVlcnk7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlJ3JlIGN1cnJlbnRseSBpbiBRVUVSWUlORy4gU2V0IGEgZmxhZyB0byBlbnN1cmUgdGhhdCB3ZSBydW4gYW5vdGhlclxuICAgICAgLy8gcXVlcnkgd2hlbiB3ZSdyZSBkb25lLlxuICAgICAgc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5ID0gdHJ1ZTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBZaWVsZHMhXG4gIF9kb25lUXVlcnlpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUud2FpdFVudGlsQ2F1Z2h0VXAoKTsgIC8vIHlpZWxkc1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICB0aHJvdyBFcnJvcihcIlBoYXNlIHVuZXhwZWN0ZWRseSBcIiArIHNlbGYuX3BoYXNlKTtcblxuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzZWxmLl9yZXF1ZXJ5V2hlbkRvbmVUaGlzUXVlcnkpIHtcbiAgICAgICAgc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5ID0gZmFsc2U7XG4gICAgICAgIHNlbGYuX3BvbGxRdWVyeSgpO1xuICAgICAgfSBlbHNlIGlmIChzZWxmLl9uZWVkVG9GZXRjaC5lbXB0eSgpKSB7XG4gICAgICAgIHNlbGYuX2JlU3RlYWR5KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgX2N1cnNvckZvclF1ZXJ5OiBmdW5jdGlvbiAob3B0aW9uc092ZXJ3cml0ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgLy8gVGhlIHF1ZXJ5IHdlIHJ1biBpcyBhbG1vc3QgdGhlIHNhbWUgYXMgdGhlIGN1cnNvciB3ZSBhcmUgb2JzZXJ2aW5nLFxuICAgICAgLy8gd2l0aCBhIGZldyBjaGFuZ2VzLiBXZSBuZWVkIHRvIHJlYWQgYWxsIHRoZSBmaWVsZHMgdGhhdCBhcmUgcmVsZXZhbnQgdG9cbiAgICAgIC8vIHRoZSBzZWxlY3Rvciwgbm90IGp1c3QgdGhlIGZpZWxkcyB3ZSBhcmUgZ29pbmcgdG8gcHVibGlzaCAodGhhdCdzIHRoZVxuICAgICAgLy8gXCJzaGFyZWRcIiBwcm9qZWN0aW9uKS4gQW5kIHdlIGRvbid0IHdhbnQgdG8gYXBwbHkgYW55IHRyYW5zZm9ybSBpbiB0aGVcbiAgICAgIC8vIGN1cnNvciwgYmVjYXVzZSBvYnNlcnZlQ2hhbmdlcyBzaG91bGRuJ3QgdXNlIHRoZSB0cmFuc2Zvcm0uXG4gICAgICB2YXIgb3B0aW9ucyA9IF8uY2xvbmUoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucyk7XG5cbiAgICAgIC8vIEFsbG93IHRoZSBjYWxsZXIgdG8gbW9kaWZ5IHRoZSBvcHRpb25zLiBVc2VmdWwgdG8gc3BlY2lmeSBkaWZmZXJlbnRcbiAgICAgIC8vIHNraXAgYW5kIGxpbWl0IHZhbHVlcy5cbiAgICAgIF8uZXh0ZW5kKG9wdGlvbnMsIG9wdGlvbnNPdmVyd3JpdGUpO1xuXG4gICAgICBvcHRpb25zLmZpZWxkcyA9IHNlbGYuX3NoYXJlZFByb2plY3Rpb247XG4gICAgICBkZWxldGUgb3B0aW9ucy50cmFuc2Zvcm07XG4gICAgICAvLyBXZSBhcmUgTk9UIGRlZXAgY2xvbmluZyBmaWVsZHMgb3Igc2VsZWN0b3IgaGVyZSwgd2hpY2ggc2hvdWxkIGJlIE9LLlxuICAgICAgdmFyIGRlc2NyaXB0aW9uID0gbmV3IEN1cnNvckRlc2NyaXB0aW9uKFxuICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IsXG4gICAgICAgIG9wdGlvbnMpO1xuICAgICAgcmV0dXJuIG5ldyBDdXJzb3Ioc2VsZi5fbW9uZ29IYW5kbGUsIGRlc2NyaXB0aW9uKTtcbiAgICB9KTtcbiAgfSxcblxuXG4gIC8vIFJlcGxhY2Ugc2VsZi5fcHVibGlzaGVkIHdpdGggbmV3UmVzdWx0cyAoYm90aCBhcmUgSWRNYXBzKSwgaW52b2tpbmcgb2JzZXJ2ZVxuICAvLyBjYWxsYmFja3Mgb24gdGhlIG11bHRpcGxleGVyLlxuICAvLyBSZXBsYWNlIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyIHdpdGggbmV3QnVmZmVyLlxuICAvL1xuICAvLyBYWFggVGhpcyBpcyB2ZXJ5IHNpbWlsYXIgdG8gTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzLiBXZVxuICAvLyBzaG91bGQgcmVhbGx5OiAoYSkgVW5pZnkgSWRNYXAgYW5kIE9yZGVyZWREaWN0IGludG8gVW5vcmRlcmVkL09yZGVyZWREaWN0XG4gIC8vIChiKSBSZXdyaXRlIGRpZmYuanMgdG8gdXNlIHRoZXNlIGNsYXNzZXMgaW5zdGVhZCBvZiBhcnJheXMgYW5kIG9iamVjdHMuXG4gIF9wdWJsaXNoTmV3UmVzdWx0czogZnVuY3Rpb24gKG5ld1Jlc3VsdHMsIG5ld0J1ZmZlcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIElmIHRoZSBxdWVyeSBpcyBsaW1pdGVkIGFuZCB0aGVyZSBpcyBhIGJ1ZmZlciwgc2h1dCBkb3duIHNvIGl0IGRvZXNuJ3RcbiAgICAgIC8vIHN0YXkgaW4gYSB3YXkuXG4gICAgICBpZiAoc2VsZi5fbGltaXQpIHtcbiAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuY2xlYXIoKTtcbiAgICAgIH1cblxuICAgICAgLy8gRmlyc3QgcmVtb3ZlIGFueXRoaW5nIHRoYXQncyBnb25lLiBCZSBjYXJlZnVsIG5vdCB0byBtb2RpZnlcbiAgICAgIC8vIHNlbGYuX3B1Ymxpc2hlZCB3aGlsZSBpdGVyYXRpbmcgb3ZlciBpdC5cbiAgICAgIHZhciBpZHNUb1JlbW92ZSA9IFtdO1xuICAgICAgc2VsZi5fcHVibGlzaGVkLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgaWYgKCFuZXdSZXN1bHRzLmhhcyhpZCkpXG4gICAgICAgICAgaWRzVG9SZW1vdmUucHVzaChpZCk7XG4gICAgICB9KTtcbiAgICAgIF8uZWFjaChpZHNUb1JlbW92ZSwgZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHNlbGYuX3JlbW92ZVB1Ymxpc2hlZChpZCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gTm93IGRvIGFkZHMgYW5kIGNoYW5nZXMuXG4gICAgICAvLyBJZiBzZWxmIGhhcyBhIGJ1ZmZlciBhbmQgbGltaXQsIHRoZSBuZXcgZmV0Y2hlZCByZXN1bHQgd2lsbCBiZVxuICAgICAgLy8gbGltaXRlZCBjb3JyZWN0bHkgYXMgdGhlIHF1ZXJ5IGhhcyBzb3J0IHNwZWNpZmllci5cbiAgICAgIG5ld1Jlc3VsdHMuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIGRvYyk7XG4gICAgICB9KTtcblxuICAgICAgLy8gU2FuaXR5LWNoZWNrIHRoYXQgZXZlcnl0aGluZyB3ZSB0cmllZCB0byBwdXQgaW50byBfcHVibGlzaGVkIGVuZGVkIHVwXG4gICAgICAvLyB0aGVyZS5cbiAgICAgIC8vIFhYWCBpZiB0aGlzIGlzIHNsb3csIHJlbW92ZSBpdCBsYXRlclxuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgIT09IG5ld1Jlc3VsdHMuc2l6ZSgpKSB7XG4gICAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAgIFwiVGhlIE1vbmdvIHNlcnZlciBhbmQgdGhlIE1ldGVvciBxdWVyeSBkaXNhZ3JlZSBvbiBob3cgXCIgK1xuICAgICAgICAgICAgXCJtYW55IGRvY3VtZW50cyBtYXRjaCB5b3VyIHF1ZXJ5LiBNYXliZSBpdCBpcyBoaXR0aW5nIGEgTW9uZ28gXCIgK1xuICAgICAgICAgICAgXCJlZGdlIGNhc2U/IFRoZSBxdWVyeSBpczogXCIgK1xuICAgICAgICAgICAgRUpTT04uc3RyaW5naWZ5KHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKSk7XG4gICAgICB9XG4gICAgICBzZWxmLl9wdWJsaXNoZWQuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgICBpZiAoIW5ld1Jlc3VsdHMuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBFcnJvcihcIl9wdWJsaXNoZWQgaGFzIGEgZG9jIHRoYXQgbmV3UmVzdWx0cyBkb2Vzbid0OyBcIiArIGlkKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBGaW5hbGx5LCByZXBsYWNlIHRoZSBidWZmZXJcbiAgICAgIG5ld0J1ZmZlci5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKGlkLCBkb2MpO1xuICAgICAgfSk7XG5cbiAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IG5ld0J1ZmZlci5zaXplKCkgPCBzZWxmLl9saW1pdDtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBUaGlzIHN0b3AgZnVuY3Rpb24gaXMgaW52b2tlZCBmcm9tIHRoZSBvblN0b3Agb2YgdGhlIE9ic2VydmVNdWx0aXBsZXhlciwgc29cbiAgLy8gaXQgc2hvdWxkbid0IGFjdHVhbGx5IGJlIHBvc3NpYmxlIHRvIGNhbGwgaXQgdW50aWwgdGhlIG11bHRpcGxleGVyIGlzXG4gIC8vIHJlYWR5LlxuICAvL1xuICAvLyBJdCdzIGltcG9ydGFudCB0byBjaGVjayBzZWxmLl9zdG9wcGVkIGFmdGVyIGV2ZXJ5IGNhbGwgaW4gdGhpcyBmaWxlIHRoYXRcbiAgLy8gY2FuIHlpZWxkIVxuICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuICAgIHNlbGYuX3N0b3BwZWQgPSB0cnVlO1xuICAgIF8uZWFjaChzZWxmLl9zdG9wSGFuZGxlcywgZnVuY3Rpb24gKGhhbmRsZSkge1xuICAgICAgaGFuZGxlLnN0b3AoKTtcbiAgICB9KTtcblxuICAgIC8vIE5vdGU6IHdlICpkb24ndCogdXNlIG11bHRpcGxleGVyLm9uRmx1c2ggaGVyZSBiZWNhdXNlIHRoaXMgc3RvcFxuICAgIC8vIGNhbGxiYWNrIGlzIGFjdHVhbGx5IGludm9rZWQgYnkgdGhlIG11bHRpcGxleGVyIGl0c2VsZiB3aGVuIGl0IGhhc1xuICAgIC8vIGRldGVybWluZWQgdGhhdCB0aGVyZSBhcmUgbm8gaGFuZGxlcyBsZWZ0LiBTbyBub3RoaW5nIGlzIGFjdHVhbGx5IGdvaW5nXG4gICAgLy8gdG8gZ2V0IGZsdXNoZWQgKGFuZCBpdCdzIHByb2JhYmx5IG5vdCB2YWxpZCB0byBjYWxsIG1ldGhvZHMgb24gdGhlXG4gICAgLy8gZHlpbmcgbXVsdGlwbGV4ZXIpLlxuICAgIF8uZWFjaChzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5LCBmdW5jdGlvbiAodykge1xuICAgICAgdy5jb21taXR0ZWQoKTsgIC8vIG1heWJlIHlpZWxkcz9cbiAgICB9KTtcbiAgICBzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5ID0gbnVsbDtcblxuICAgIC8vIFByb2FjdGl2ZWx5IGRyb3AgcmVmZXJlbmNlcyB0byBwb3RlbnRpYWxseSBiaWcgdGhpbmdzLlxuICAgIHNlbGYuX3B1Ymxpc2hlZCA9IG51bGw7XG4gICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgPSBudWxsO1xuICAgIHNlbGYuX25lZWRUb0ZldGNoID0gbnVsbDtcbiAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZyA9IG51bGw7XG4gICAgc2VsZi5fb3Bsb2dFbnRyeUhhbmRsZSA9IG51bGw7XG4gICAgc2VsZi5fbGlzdGVuZXJzSGFuZGxlID0gbnVsbDtcblxuICAgIFBhY2thZ2UuZmFjdHMgJiYgUGFja2FnZS5mYWN0cy5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1vcGxvZ1wiLCAtMSk7XG4gIH0sXG5cbiAgX3JlZ2lzdGVyUGhhc2VDaGFuZ2U6IGZ1bmN0aW9uIChwaGFzZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbm93ID0gbmV3IERhdGU7XG5cbiAgICAgIGlmIChzZWxmLl9waGFzZSkge1xuICAgICAgICB2YXIgdGltZURpZmYgPSBub3cgLSBzZWxmLl9waGFzZVN0YXJ0VGltZTtcbiAgICAgICAgUGFja2FnZS5mYWN0cyAmJiBQYWNrYWdlLmZhY3RzLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcInRpbWUtc3BlbnQtaW4tXCIgKyBzZWxmLl9waGFzZSArIFwiLXBoYXNlXCIsIHRpbWVEaWZmKTtcbiAgICAgIH1cblxuICAgICAgc2VsZi5fcGhhc2UgPSBwaGFzZTtcbiAgICAgIHNlbGYuX3BoYXNlU3RhcnRUaW1lID0gbm93O1xuICAgIH0pO1xuICB9XG59KTtcblxuLy8gRG9lcyBvdXIgb3Bsb2cgdGFpbGluZyBjb2RlIHN1cHBvcnQgdGhpcyBjdXJzb3I/IEZvciBub3csIHdlIGFyZSBiZWluZyB2ZXJ5XG4vLyBjb25zZXJ2YXRpdmUgYW5kIGFsbG93aW5nIG9ubHkgc2ltcGxlIHF1ZXJpZXMgd2l0aCBzaW1wbGUgb3B0aW9ucy5cbi8vIChUaGlzIGlzIGEgXCJzdGF0aWMgbWV0aG9kXCIuKVxuT3Bsb2dPYnNlcnZlRHJpdmVyLmN1cnNvclN1cHBvcnRlZCA9IGZ1bmN0aW9uIChjdXJzb3JEZXNjcmlwdGlvbiwgbWF0Y2hlcikge1xuICAvLyBGaXJzdCwgY2hlY2sgdGhlIG9wdGlvbnMuXG4gIHZhciBvcHRpb25zID0gY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucztcblxuICAvLyBEaWQgdGhlIHVzZXIgc2F5IG5vIGV4cGxpY2l0bHk/XG4gIC8vIHVuZGVyc2NvcmVkIHZlcnNpb24gb2YgdGhlIG9wdGlvbiBpcyBDT01QQVQgd2l0aCAxLjJcbiAgaWYgKG9wdGlvbnMuZGlzYWJsZU9wbG9nIHx8IG9wdGlvbnMuX2Rpc2FibGVPcGxvZylcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gc2tpcCBpcyBub3Qgc3VwcG9ydGVkOiB0byBzdXBwb3J0IGl0IHdlIHdvdWxkIG5lZWQgdG8ga2VlcCB0cmFjayBvZiBhbGxcbiAgLy8gXCJza2lwcGVkXCIgZG9jdW1lbnRzIG9yIGF0IGxlYXN0IHRoZWlyIGlkcy5cbiAgLy8gbGltaXQgdy9vIGEgc29ydCBzcGVjaWZpZXIgaXMgbm90IHN1cHBvcnRlZDogY3VycmVudCBpbXBsZW1lbnRhdGlvbiBuZWVkcyBhXG4gIC8vIGRldGVybWluaXN0aWMgd2F5IHRvIG9yZGVyIGRvY3VtZW50cy5cbiAgaWYgKG9wdGlvbnMuc2tpcCB8fCAob3B0aW9ucy5saW1pdCAmJiAhb3B0aW9ucy5zb3J0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIElmIGEgZmllbGRzIHByb2plY3Rpb24gb3B0aW9uIGlzIGdpdmVuIGNoZWNrIGlmIGl0IGlzIHN1cHBvcnRlZCBieVxuICAvLyBtaW5pbW9uZ28gKHNvbWUgb3BlcmF0b3JzIGFyZSBub3Qgc3VwcG9ydGVkKS5cbiAgaWYgKG9wdGlvbnMuZmllbGRzKSB7XG4gICAgdHJ5IHtcbiAgICAgIExvY2FsQ29sbGVjdGlvbi5fY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uKG9wdGlvbnMuZmllbGRzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5uYW1lID09PSBcIk1pbmltb25nb0Vycm9yXCIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBXZSBkb24ndCBhbGxvdyB0aGUgZm9sbG93aW5nIHNlbGVjdG9yczpcbiAgLy8gICAtICR3aGVyZSAobm90IGNvbmZpZGVudCB0aGF0IHdlIHByb3ZpZGUgdGhlIHNhbWUgSlMgZW52aXJvbm1lbnRcbiAgLy8gICAgICAgICAgICAgYXMgTW9uZ28sIGFuZCBjYW4geWllbGQhKVxuICAvLyAgIC0gJG5lYXIgKGhhcyBcImludGVyZXN0aW5nXCIgcHJvcGVydGllcyBpbiBNb25nb0RCLCBsaWtlIHRoZSBwb3NzaWJpbGl0eVxuICAvLyAgICAgICAgICAgIG9mIHJldHVybmluZyBhbiBJRCBtdWx0aXBsZSB0aW1lcywgdGhvdWdoIGV2ZW4gcG9sbGluZyBtYXliZVxuICAvLyAgICAgICAgICAgIGhhdmUgYSBidWcgdGhlcmUpXG4gIC8vICAgICAgICAgICBYWFg6IG9uY2Ugd2Ugc3VwcG9ydCBpdCwgd2Ugd291bGQgbmVlZCB0byB0aGluayBtb3JlIG9uIGhvdyB3ZVxuICAvLyAgICAgICAgICAgaW5pdGlhbGl6ZSB0aGUgY29tcGFyYXRvcnMgd2hlbiB3ZSBjcmVhdGUgdGhlIGRyaXZlci5cbiAgcmV0dXJuICFtYXRjaGVyLmhhc1doZXJlKCkgJiYgIW1hdGNoZXIuaGFzR2VvUXVlcnkoKTtcbn07XG5cbnZhciBtb2RpZmllckNhbkJlRGlyZWN0bHlBcHBsaWVkID0gZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gIHJldHVybiBfLmFsbChtb2RpZmllciwgZnVuY3Rpb24gKGZpZWxkcywgb3BlcmF0aW9uKSB7XG4gICAgcmV0dXJuIF8uYWxsKGZpZWxkcywgZnVuY3Rpb24gKHZhbHVlLCBmaWVsZCkge1xuICAgICAgcmV0dXJuICEvRUpTT05cXCQvLnRlc3QoZmllbGQpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbk1vbmdvSW50ZXJuYWxzLk9wbG9nT2JzZXJ2ZURyaXZlciA9IE9wbG9nT2JzZXJ2ZURyaXZlcjtcbiIsIkxvY2FsQ29sbGVjdGlvbkRyaXZlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLm5vQ29ubkNvbGxlY3Rpb25zID0ge307XG59O1xuXG52YXIgZW5zdXJlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChuYW1lLCBjb2xsZWN0aW9ucykge1xuICBpZiAoIShuYW1lIGluIGNvbGxlY3Rpb25zKSlcbiAgICBjb2xsZWN0aW9uc1tuYW1lXSA9IG5ldyBMb2NhbENvbGxlY3Rpb24obmFtZSk7XG4gIHJldHVybiBjb2xsZWN0aW9uc1tuYW1lXTtcbn07XG5cbl8uZXh0ZW5kKExvY2FsQ29sbGVjdGlvbkRyaXZlci5wcm90b3R5cGUsIHtcbiAgb3BlbjogZnVuY3Rpb24gKG5hbWUsIGNvbm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFuYW1lKVxuICAgICAgcmV0dXJuIG5ldyBMb2NhbENvbGxlY3Rpb247XG4gICAgaWYgKCEgY29ubikge1xuICAgICAgcmV0dXJuIGVuc3VyZUNvbGxlY3Rpb24obmFtZSwgc2VsZi5ub0Nvbm5Db2xsZWN0aW9ucyk7XG4gICAgfVxuICAgIGlmICghIGNvbm4uX21vbmdvX2xpdmVkYXRhX2NvbGxlY3Rpb25zKVxuICAgICAgY29ubi5fbW9uZ29fbGl2ZWRhdGFfY29sbGVjdGlvbnMgPSB7fTtcbiAgICAvLyBYWFggaXMgdGhlcmUgYSB3YXkgdG8ga2VlcCB0cmFjayBvZiBhIGNvbm5lY3Rpb24ncyBjb2xsZWN0aW9ucyB3aXRob3V0XG4gICAgLy8gZGFuZ2xpbmcgaXQgb2ZmIHRoZSBjb25uZWN0aW9uIG9iamVjdD9cbiAgICByZXR1cm4gZW5zdXJlQ29sbGVjdGlvbihuYW1lLCBjb25uLl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucyk7XG4gIH1cbn0pO1xuXG4vLyBzaW5nbGV0b25cbkxvY2FsQ29sbGVjdGlvbkRyaXZlciA9IG5ldyBMb2NhbENvbGxlY3Rpb25Ecml2ZXI7XG4iLCJNb25nb0ludGVybmFscy5SZW1vdGVDb2xsZWN0aW9uRHJpdmVyID0gZnVuY3Rpb24gKFxuICBtb25nb191cmwsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLm1vbmdvID0gbmV3IE1vbmdvQ29ubmVjdGlvbihtb25nb191cmwsIG9wdGlvbnMpO1xufTtcblxuXy5leHRlbmQoTW9uZ29JbnRlcm5hbHMuUmVtb3RlQ29sbGVjdGlvbkRyaXZlci5wcm90b3R5cGUsIHtcbiAgb3BlbjogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJldCA9IHt9O1xuICAgIF8uZWFjaChcbiAgICAgIFsnZmluZCcsICdmaW5kT25lJywgJ2luc2VydCcsICd1cGRhdGUnLCAndXBzZXJ0JyxcbiAgICAgICAncmVtb3ZlJywgJ19lbnN1cmVJbmRleCcsICdfZHJvcEluZGV4JywgJ19jcmVhdGVDYXBwZWRDb2xsZWN0aW9uJyxcbiAgICAgICAnZHJvcENvbGxlY3Rpb24nLCAncmF3Q29sbGVjdGlvbiddLFxuICAgICAgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgcmV0W21dID0gXy5iaW5kKHNlbGYubW9uZ29bbV0sIHNlbGYubW9uZ28sIG5hbWUpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxufSk7XG5cblxuLy8gQ3JlYXRlIHRoZSBzaW5nbGV0b24gUmVtb3RlQ29sbGVjdGlvbkRyaXZlciBvbmx5IG9uIGRlbWFuZCwgc28gd2Vcbi8vIG9ubHkgcmVxdWlyZSBNb25nbyBjb25maWd1cmF0aW9uIGlmIGl0J3MgYWN0dWFsbHkgdXNlZCAoZWcsIG5vdCBpZlxuLy8geW91J3JlIG9ubHkgdHJ5aW5nIHRvIHJlY2VpdmUgZGF0YSBmcm9tIGEgcmVtb3RlIEREUCBzZXJ2ZXIuKVxuTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIgPSBfLm9uY2UoZnVuY3Rpb24gKCkge1xuICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSB7fTtcblxuICB2YXIgbW9uZ29VcmwgPSBwcm9jZXNzLmVudi5NT05HT19VUkw7XG5cbiAgaWYgKHByb2Nlc3MuZW52Lk1PTkdPX09QTE9HX1VSTCkge1xuICAgIGNvbm5lY3Rpb25PcHRpb25zLm9wbG9nVXJsID0gcHJvY2Vzcy5lbnYuTU9OR09fT1BMT0dfVVJMO1xuICB9XG5cbiAgaWYgKCEgbW9uZ29VcmwpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTU9OR09fVVJMIG11c3QgYmUgc2V0IGluIGVudmlyb25tZW50XCIpO1xuXG4gIHJldHVybiBuZXcgTW9uZ29JbnRlcm5hbHMuUmVtb3RlQ29sbGVjdGlvbkRyaXZlcihtb25nb1VybCwgY29ubmVjdGlvbk9wdGlvbnMpO1xufSk7XG4iLCIvLyBvcHRpb25zLmNvbm5lY3Rpb24sIGlmIGdpdmVuLCBpcyBhIExpdmVkYXRhQ2xpZW50IG9yIExpdmVkYXRhU2VydmVyXG4vLyBYWFggcHJlc2VudGx5IHRoZXJlIGlzIG5vIHdheSB0byBkZXN0cm95L2NsZWFuIHVwIGEgQ29sbGVjdGlvblxuXG4vKipcbiAqIEBzdW1tYXJ5IE5hbWVzcGFjZSBmb3IgTW9uZ29EQi1yZWxhdGVkIGl0ZW1zXG4gKiBAbmFtZXNwYWNlXG4gKi9cbk1vbmdvID0ge307XG5cbi8qKlxuICogQHN1bW1hcnkgQ29uc3RydWN0b3IgZm9yIGEgQ29sbGVjdGlvblxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAaW5zdGFuY2VuYW1lIGNvbGxlY3Rpb25cbiAqIEBjbGFzc1xuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uICBJZiBudWxsLCBjcmVhdGVzIGFuIHVubWFuYWdlZCAodW5zeW5jaHJvbml6ZWQpIGxvY2FsIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucy5jb25uZWN0aW9uIFRoZSBzZXJ2ZXIgY29ubmVjdGlvbiB0aGF0IHdpbGwgbWFuYWdlIHRoaXMgY29sbGVjdGlvbi4gVXNlcyB0aGUgZGVmYXVsdCBjb25uZWN0aW9uIGlmIG5vdCBzcGVjaWZpZWQuICBQYXNzIHRoZSByZXR1cm4gdmFsdWUgb2YgY2FsbGluZyBbYEREUC5jb25uZWN0YF0oI2RkcF9jb25uZWN0KSB0byBzcGVjaWZ5IGEgZGlmZmVyZW50IHNlcnZlci4gUGFzcyBgbnVsbGAgdG8gc3BlY2lmeSBubyBjb25uZWN0aW9uLiBVbm1hbmFnZWQgKGBuYW1lYCBpcyBudWxsKSBjb2xsZWN0aW9ucyBjYW5ub3Qgc3BlY2lmeSBhIGNvbm5lY3Rpb24uXG4gKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5pZEdlbmVyYXRpb24gVGhlIG1ldGhvZCBvZiBnZW5lcmF0aW5nIHRoZSBgX2lkYCBmaWVsZHMgb2YgbmV3IGRvY3VtZW50cyBpbiB0aGlzIGNvbGxlY3Rpb24uICBQb3NzaWJsZSB2YWx1ZXM6XG5cbiAtICoqYCdTVFJJTkcnYCoqOiByYW5kb20gc3RyaW5nc1xuIC0gKipgJ01PTkdPJ2AqKjogIHJhbmRvbSBbYE1vbmdvLk9iamVjdElEYF0oI21vbmdvX29iamVjdF9pZCkgdmFsdWVzXG5cblRoZSBkZWZhdWx0IGlkIGdlbmVyYXRpb24gdGVjaG5pcXVlIGlzIGAnU1RSSU5HJ2AuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBBbiBvcHRpb25hbCB0cmFuc2Zvcm1hdGlvbiBmdW5jdGlvbi4gRG9jdW1lbnRzIHdpbGwgYmUgcGFzc2VkIHRocm91Z2ggdGhpcyBmdW5jdGlvbiBiZWZvcmUgYmVpbmcgcmV0dXJuZWQgZnJvbSBgZmV0Y2hgIG9yIGBmaW5kT25lYCwgYW5kIGJlZm9yZSBiZWluZyBwYXNzZWQgdG8gY2FsbGJhY2tzIG9mIGBvYnNlcnZlYCwgYG1hcGAsIGBmb3JFYWNoYCwgYGFsbG93YCwgYW5kIGBkZW55YC4gVHJhbnNmb3JtcyBhcmUgKm5vdCogYXBwbGllZCBmb3IgdGhlIGNhbGxiYWNrcyBvZiBgb2JzZXJ2ZUNoYW5nZXNgIG9yIHRvIGN1cnNvcnMgcmV0dXJuZWQgZnJvbSBwdWJsaXNoIGZ1bmN0aW9ucy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5kZWZpbmVNdXRhdGlvbk1ldGhvZHMgU2V0IHRvIGBmYWxzZWAgdG8gc2tpcCBzZXR0aW5nIHVwIHRoZSBtdXRhdGlvbiBtZXRob2RzIHRoYXQgZW5hYmxlIGluc2VydC91cGRhdGUvcmVtb3ZlIGZyb20gY2xpZW50IGNvZGUuIERlZmF1bHQgYHRydWVgLlxuICovXG5Nb25nby5Db2xsZWN0aW9uID0gZnVuY3Rpb24gKG5hbWUsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoISAoc2VsZiBpbnN0YW5jZW9mIE1vbmdvLkNvbGxlY3Rpb24pKVxuICAgIHRocm93IG5ldyBFcnJvcigndXNlIFwibmV3XCIgdG8gY29uc3RydWN0IGEgTW9uZ28uQ29sbGVjdGlvbicpO1xuXG4gIGlmICghbmFtZSAmJiAobmFtZSAhPT0gbnVsbCkpIHtcbiAgICBNZXRlb3IuX2RlYnVnKFwiV2FybmluZzogY3JlYXRpbmcgYW5vbnltb3VzIGNvbGxlY3Rpb24uIEl0IHdpbGwgbm90IGJlIFwiICtcbiAgICAgICAgICAgICAgICAgIFwic2F2ZWQgb3Igc3luY2hyb25pemVkIG92ZXIgdGhlIG5ldHdvcmsuIChQYXNzIG51bGwgZm9yIFwiICtcbiAgICAgICAgICAgICAgICAgIFwidGhlIGNvbGxlY3Rpb24gbmFtZSB0byB0dXJuIG9mZiB0aGlzIHdhcm5pbmcuKVwiKTtcbiAgICBuYW1lID0gbnVsbDtcbiAgfVxuXG4gIGlmIChuYW1lICE9PSBudWxsICYmIHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJGaXJzdCBhcmd1bWVudCB0byBuZXcgTW9uZ28uQ29sbGVjdGlvbiBtdXN0IGJlIGEgc3RyaW5nIG9yIG51bGxcIik7XG4gIH1cblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLm1ldGhvZHMpIHtcbiAgICAvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBoYWNrIHdpdGggb3JpZ2luYWwgc2lnbmF0dXJlICh3aGljaCBwYXNzZWRcbiAgICAvLyBcImNvbm5lY3Rpb25cIiBkaXJlY3RseSBpbnN0ZWFkIG9mIGluIG9wdGlvbnMuIChDb25uZWN0aW9ucyBtdXN0IGhhdmUgYSBcIm1ldGhvZHNcIlxuICAgIC8vIG1ldGhvZC4pXG4gICAgLy8gWFhYIHJlbW92ZSBiZWZvcmUgMS4wXG4gICAgb3B0aW9ucyA9IHtjb25uZWN0aW9uOiBvcHRpb25zfTtcbiAgfVxuICAvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eTogXCJjb25uZWN0aW9uXCIgdXNlZCB0byBiZSBjYWxsZWQgXCJtYW5hZ2VyXCIuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMubWFuYWdlciAmJiAhb3B0aW9ucy5jb25uZWN0aW9uKSB7XG4gICAgb3B0aW9ucy5jb25uZWN0aW9uID0gb3B0aW9ucy5tYW5hZ2VyO1xuICB9XG4gIG9wdGlvbnMgPSBfLmV4dGVuZCh7XG4gICAgY29ubmVjdGlvbjogdW5kZWZpbmVkLFxuICAgIGlkR2VuZXJhdGlvbjogJ1NUUklORycsXG4gICAgdHJhbnNmb3JtOiBudWxsLFxuICAgIF9kcml2ZXI6IHVuZGVmaW5lZCxcbiAgICBfcHJldmVudEF1dG9wdWJsaXNoOiBmYWxzZVxuICB9LCBvcHRpb25zKTtcblxuICBzd2l0Y2ggKG9wdGlvbnMuaWRHZW5lcmF0aW9uKSB7XG4gIGNhc2UgJ01PTkdPJzpcbiAgICBzZWxmLl9tYWtlTmV3SUQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgc3JjID0gbmFtZSA/IEREUC5yYW5kb21TdHJlYW0oJy9jb2xsZWN0aW9uLycgKyBuYW1lKSA6IFJhbmRvbS5pbnNlY3VyZTtcbiAgICAgIHJldHVybiBuZXcgTW9uZ28uT2JqZWN0SUQoc3JjLmhleFN0cmluZygyNCkpO1xuICAgIH07XG4gICAgYnJlYWs7XG4gIGNhc2UgJ1NUUklORyc6XG4gIGRlZmF1bHQ6XG4gICAgc2VsZi5fbWFrZU5ld0lEID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHNyYyA9IG5hbWUgPyBERFAucmFuZG9tU3RyZWFtKCcvY29sbGVjdGlvbi8nICsgbmFtZSkgOiBSYW5kb20uaW5zZWN1cmU7XG4gICAgICByZXR1cm4gc3JjLmlkKCk7XG4gICAgfTtcbiAgICBicmVhaztcbiAgfVxuXG4gIHNlbGYuX3RyYW5zZm9ybSA9IExvY2FsQ29sbGVjdGlvbi53cmFwVHJhbnNmb3JtKG9wdGlvbnMudHJhbnNmb3JtKTtcblxuICBpZiAoISBuYW1lIHx8IG9wdGlvbnMuY29ubmVjdGlvbiA9PT0gbnVsbClcbiAgICAvLyBub3RlOiBuYW1lbGVzcyBjb2xsZWN0aW9ucyBuZXZlciBoYXZlIGEgY29ubmVjdGlvblxuICAgIHNlbGYuX2Nvbm5lY3Rpb24gPSBudWxsO1xuICBlbHNlIGlmIChvcHRpb25zLmNvbm5lY3Rpb24pXG4gICAgc2VsZi5fY29ubmVjdGlvbiA9IG9wdGlvbnMuY29ubmVjdGlvbjtcbiAgZWxzZSBpZiAoTWV0ZW9yLmlzQ2xpZW50KVxuICAgIHNlbGYuX2Nvbm5lY3Rpb24gPSBNZXRlb3IuY29ubmVjdGlvbjtcbiAgZWxzZVxuICAgIHNlbGYuX2Nvbm5lY3Rpb24gPSBNZXRlb3Iuc2VydmVyO1xuXG4gIGlmICghb3B0aW9ucy5fZHJpdmVyKSB7XG4gICAgLy8gWFhYIFRoaXMgY2hlY2sgYXNzdW1lcyB0aGF0IHdlYmFwcCBpcyBsb2FkZWQgc28gdGhhdCBNZXRlb3Iuc2VydmVyICE9PVxuICAgIC8vIG51bGwuIFdlIHNob3VsZCBmdWxseSBzdXBwb3J0IHRoZSBjYXNlIG9mIFwid2FudCB0byB1c2UgYSBNb25nby1iYWNrZWRcbiAgICAvLyBjb2xsZWN0aW9uIGZyb20gTm9kZSBjb2RlIHdpdGhvdXQgd2ViYXBwXCIsIGJ1dCB3ZSBkb24ndCB5ZXQuXG4gICAgLy8gI01ldGVvclNlcnZlck51bGxcbiAgICBpZiAobmFtZSAmJiBzZWxmLl9jb25uZWN0aW9uID09PSBNZXRlb3Iuc2VydmVyICYmXG4gICAgICAgIHR5cGVvZiBNb25nb0ludGVybmFscyAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICBNb25nb0ludGVybmFscy5kZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlcikge1xuICAgICAgb3B0aW9ucy5fZHJpdmVyID0gTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucy5fZHJpdmVyID0gTG9jYWxDb2xsZWN0aW9uRHJpdmVyO1xuICAgIH1cbiAgfVxuXG4gIHNlbGYuX2NvbGxlY3Rpb24gPSBvcHRpb25zLl9kcml2ZXIub3BlbihuYW1lLCBzZWxmLl9jb25uZWN0aW9uKTtcbiAgc2VsZi5fbmFtZSA9IG5hbWU7XG4gIHNlbGYuX2RyaXZlciA9IG9wdGlvbnMuX2RyaXZlcjtcblxuICBpZiAoc2VsZi5fY29ubmVjdGlvbiAmJiBzZWxmLl9jb25uZWN0aW9uLnJlZ2lzdGVyU3RvcmUpIHtcbiAgICAvLyBPSywgd2UncmUgZ29pbmcgdG8gYmUgYSBzbGF2ZSwgcmVwbGljYXRpbmcgc29tZSByZW1vdGVcbiAgICAvLyBkYXRhYmFzZSwgZXhjZXB0IHBvc3NpYmx5IHdpdGggc29tZSB0ZW1wb3JhcnkgZGl2ZXJnZW5jZSB3aGlsZVxuICAgIC8vIHdlIGhhdmUgdW5hY2tub3dsZWRnZWQgUlBDJ3MuXG4gICAgdmFyIG9rID0gc2VsZi5fY29ubmVjdGlvbi5yZWdpc3RlclN0b3JlKG5hbWUsIHtcbiAgICAgIC8vIENhbGxlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIGEgYmF0Y2ggb2YgdXBkYXRlcy4gYmF0Y2hTaXplIGlzIHRoZSBudW1iZXJcbiAgICAgIC8vIG9mIHVwZGF0ZSBjYWxscyB0byBleHBlY3QuXG4gICAgICAvL1xuICAgICAgLy8gWFhYIFRoaXMgaW50ZXJmYWNlIGlzIHByZXR0eSBqYW5reS4gcmVzZXQgcHJvYmFibHkgb3VnaHQgdG8gZ28gYmFjayB0b1xuICAgICAgLy8gYmVpbmcgaXRzIG93biBmdW5jdGlvbiwgYW5kIGNhbGxlcnMgc2hvdWxkbid0IGhhdmUgdG8gY2FsY3VsYXRlXG4gICAgICAvLyBiYXRjaFNpemUuIFRoZSBvcHRpbWl6YXRpb24gb2Ygbm90IGNhbGxpbmcgcGF1c2UvcmVtb3ZlIHNob3VsZCBiZVxuICAgICAgLy8gZGVsYXllZCB1bnRpbCBsYXRlcjogdGhlIGZpcnN0IGNhbGwgdG8gdXBkYXRlKCkgc2hvdWxkIGJ1ZmZlciBpdHNcbiAgICAgIC8vIG1lc3NhZ2UsIGFuZCB0aGVuIHdlIGNhbiBlaXRoZXIgZGlyZWN0bHkgYXBwbHkgaXQgYXQgZW5kVXBkYXRlIHRpbWUgaWZcbiAgICAgIC8vIGl0IHdhcyB0aGUgb25seSB1cGRhdGUsIG9yIGRvIHBhdXNlT2JzZXJ2ZXJzL2FwcGx5L2FwcGx5IGF0IHRoZSBuZXh0XG4gICAgICAvLyB1cGRhdGUoKSBpZiB0aGVyZSdzIGFub3RoZXIgb25lLlxuICAgICAgYmVnaW5VcGRhdGU6IGZ1bmN0aW9uIChiYXRjaFNpemUsIHJlc2V0KSB7XG4gICAgICAgIC8vIHBhdXNlIG9ic2VydmVycyBzbyB1c2VycyBkb24ndCBzZWUgZmxpY2tlciB3aGVuIHVwZGF0aW5nIHNldmVyYWxcbiAgICAgICAgLy8gb2JqZWN0cyBhdCBvbmNlIChpbmNsdWRpbmcgdGhlIHBvc3QtcmVjb25uZWN0IHJlc2V0LWFuZC1yZWFwcGx5XG4gICAgICAgIC8vIHN0YWdlKSwgYW5kIHNvIHRoYXQgYSByZS1zb3J0aW5nIG9mIGEgcXVlcnkgY2FuIHRha2UgYWR2YW50YWdlIG9mIHRoZVxuICAgICAgICAvLyBmdWxsIF9kaWZmUXVlcnkgbW92ZWQgY2FsY3VsYXRpb24gaW5zdGVhZCBvZiBhcHBseWluZyBjaGFuZ2Ugb25lIGF0IGFcbiAgICAgICAgLy8gdGltZS5cbiAgICAgICAgaWYgKGJhdGNoU2l6ZSA+IDEgfHwgcmVzZXQpXG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5wYXVzZU9ic2VydmVycygpO1xuXG4gICAgICAgIGlmIChyZXNldClcbiAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZSh7fSk7XG4gICAgICB9LFxuXG4gICAgICAvLyBBcHBseSBhbiB1cGRhdGUuXG4gICAgICAvLyBYWFggYmV0dGVyIHNwZWNpZnkgdGhpcyBpbnRlcmZhY2UgKG5vdCBpbiB0ZXJtcyBvZiBhIHdpcmUgbWVzc2FnZSk/XG4gICAgICB1cGRhdGU6IGZ1bmN0aW9uIChtc2cpIHtcbiAgICAgICAgdmFyIG1vbmdvSWQgPSBNb25nb0lELmlkUGFyc2UobXNnLmlkKTtcbiAgICAgICAgdmFyIGRvYyA9IHNlbGYuX2NvbGxlY3Rpb24uZmluZE9uZShtb25nb0lkKTtcblxuICAgICAgICAvLyBJcyB0aGlzIGEgXCJyZXBsYWNlIHRoZSB3aG9sZSBkb2NcIiBtZXNzYWdlIGNvbWluZyBmcm9tIHRoZSBxdWllc2NlbmNlXG4gICAgICAgIC8vIG9mIG1ldGhvZCB3cml0ZXMgdG8gYW4gb2JqZWN0PyAoTm90ZSB0aGF0ICd1bmRlZmluZWQnIGlzIGEgdmFsaWRcbiAgICAgICAgLy8gdmFsdWUgbWVhbmluZyBcInJlbW92ZSBpdFwiLilcbiAgICAgICAgaWYgKG1zZy5tc2cgPT09ICdyZXBsYWNlJykge1xuICAgICAgICAgIHZhciByZXBsYWNlID0gbXNnLnJlcGxhY2U7XG4gICAgICAgICAgaWYgKCFyZXBsYWNlKSB7XG4gICAgICAgICAgICBpZiAoZG9jKVxuICAgICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZShtb25nb0lkKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCFkb2MpIHtcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0KHJlcGxhY2UpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBYWFggY2hlY2sgdGhhdCByZXBsYWNlIGhhcyBubyAkIG9wc1xuICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi51cGRhdGUobW9uZ29JZCwgcmVwbGFjZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAnYWRkZWQnKSB7XG4gICAgICAgICAgaWYgKGRvYykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgbm90IHRvIGZpbmQgYSBkb2N1bWVudCBhbHJlYWR5IHByZXNlbnQgZm9yIGFuIGFkZFwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5pbnNlcnQoXy5leHRlbmQoe19pZDogbW9uZ29JZH0sIG1zZy5maWVsZHMpKTtcbiAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAncmVtb3ZlZCcpIHtcbiAgICAgICAgICBpZiAoIWRvYylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIHRvIGZpbmQgYSBkb2N1bWVudCBhbHJlYWR5IHByZXNlbnQgZm9yIHJlbW92ZWRcIik7XG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmUobW9uZ29JZCk7XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ2NoYW5nZWQnKSB7XG4gICAgICAgICAgaWYgKCFkb2MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCB0byBmaW5kIGEgZG9jdW1lbnQgdG8gY2hhbmdlXCIpO1xuICAgICAgICAgIGlmICghXy5pc0VtcHR5KG1zZy5maWVsZHMpKSB7XG4gICAgICAgICAgICB2YXIgbW9kaWZpZXIgPSB7fTtcbiAgICAgICAgICAgIF8uZWFjaChtc2cuZmllbGRzLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmICghbW9kaWZpZXIuJHVuc2V0KVxuICAgICAgICAgICAgICAgICAgbW9kaWZpZXIuJHVuc2V0ID0ge307XG4gICAgICAgICAgICAgICAgbW9kaWZpZXIuJHVuc2V0W2tleV0gPSAxO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghbW9kaWZpZXIuJHNldClcbiAgICAgICAgICAgICAgICAgIG1vZGlmaWVyLiRzZXQgPSB7fTtcbiAgICAgICAgICAgICAgICBtb2RpZmllci4kc2V0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnVwZGF0ZShtb25nb0lkLCBtb2RpZmllcik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkkgZG9uJ3Qga25vdyBob3cgdG8gZGVhbCB3aXRoIHRoaXMgbWVzc2FnZVwiKTtcbiAgICAgICAgfVxuXG4gICAgICB9LFxuXG4gICAgICAvLyBDYWxsZWQgYXQgdGhlIGVuZCBvZiBhIGJhdGNoIG9mIHVwZGF0ZXMuXG4gICAgICBlbmRVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZXN1bWVPYnNlcnZlcnMoKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIENhbGxlZCBhcm91bmQgbWV0aG9kIHN0dWIgaW52b2NhdGlvbnMgdG8gY2FwdHVyZSB0aGUgb3JpZ2luYWwgdmVyc2lvbnNcbiAgICAgIC8vIG9mIG1vZGlmaWVkIGRvY3VtZW50cy5cbiAgICAgIHNhdmVPcmlnaW5hbHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5zYXZlT3JpZ2luYWxzKCk7XG4gICAgICB9LFxuICAgICAgcmV0cmlldmVPcmlnaW5hbHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24ucmV0cmlldmVPcmlnaW5hbHMoKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIFVzZWQgdG8gcHJlc2VydmUgY3VycmVudCB2ZXJzaW9ucyBvZiBkb2N1bWVudHMgYWNyb3NzIGEgc3RvcmUgcmVzZXQuXG4gICAgICBnZXREb2M6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHJldHVybiBzZWxmLmZpbmRPbmUoaWQpO1xuICAgICAgfSxcblxuICAgICAgLy8gVG8gYmUgYWJsZSB0byBnZXQgYmFjayB0byB0aGUgY29sbGVjdGlvbiBmcm9tIHRoZSBzdG9yZS5cbiAgICAgIF9nZXRDb2xsZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFvaykge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGBUaGVyZSBpcyBhbHJlYWR5IGEgY29sbGVjdGlvbiBuYW1lZCBcIiR7bmFtZX1cImA7XG4gICAgICBpZiAob3B0aW9ucy5fc3VwcHJlc3NTYW1lTmFtZUVycm9yID09PSB0cnVlKSB7XG4gICAgICAgIC8vIFhYWCBJbiB0aGVvcnkgd2UgZG8gbm90IGhhdmUgdG8gdGhyb3cgd2hlbiBgb2tgIGlzIGZhbHN5LiBUaGUgc3RvcmUgaXMgYWxyZWFkeSBkZWZpbmVkXG4gICAgICAgIC8vIGZvciB0aGlzIGNvbGxlY3Rpb24gbmFtZSwgYnV0IHRoaXMgd2lsbCBzaW1wbHkgYmUgYW5vdGhlciByZWZlcmVuY2UgdG8gaXQgYW5kIGV2ZXJ5dGhpbmdcbiAgICAgICAgLy8gc2hvdWxkIHdvcmsuIEhvd2V2ZXIsIHdlIGhhdmUgaGlzdG9yaWNhbGx5IHRocm93biBhbiBlcnJvciBoZXJlLCBzbyBmb3Igbm93IHdlIHdpbGxcbiAgICAgICAgLy8gc2tpcCB0aGUgZXJyb3Igb25seSB3aGVuIGBfc3VwcHJlc3NTYW1lTmFtZUVycm9yYCBpcyBgdHJ1ZWAsIGFsbG93aW5nIHBlb3BsZSB0byBvcHQgaW5cbiAgICAgICAgLy8gYW5kIGdpdmUgdGhpcyBzb21lIHJlYWwgd29ybGQgdGVzdGluZy5cbiAgICAgICAgY29uc29sZS53YXJuID8gY29uc29sZS53YXJuKG1lc3NhZ2UpIDogY29uc29sZS5sb2cobWVzc2FnZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gWFhYIGRvbid0IGRlZmluZSB0aGVzZSB1bnRpbCBhbGxvdyBvciBkZW55IGlzIGFjdHVhbGx5IHVzZWQgZm9yIHRoaXNcbiAgLy8gY29sbGVjdGlvbi4gQ291bGQgYmUgaGFyZCBpZiB0aGUgc2VjdXJpdHkgcnVsZXMgYXJlIG9ubHkgZGVmaW5lZCBvbiB0aGVcbiAgLy8gc2VydmVyLlxuICBpZiAob3B0aW9ucy5kZWZpbmVNdXRhdGlvbk1ldGhvZHMgIT09IGZhbHNlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHNlbGYuX2RlZmluZU11dGF0aW9uTWV0aG9kcyh7IHVzZUV4aXN0aW5nOiAob3B0aW9ucy5fc3VwcHJlc3NTYW1lTmFtZUVycm9yID09PSB0cnVlKSB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gVGhyb3cgYSBtb3JlIHVuZGVyc3RhbmRhYmxlIGVycm9yIG9uIHRoZSBzZXJ2ZXIgZm9yIHNhbWUgY29sbGVjdGlvbiBuYW1lXG4gICAgICBpZiAoZXJyb3IubWVzc2FnZSA9PT0gYEEgbWV0aG9kIG5hbWVkICcvJHtuYW1lfS9pbnNlcnQnIGlzIGFscmVhZHkgZGVmaW5lZGApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlcmUgaXMgYWxyZWFkeSBhIGNvbGxlY3Rpb24gbmFtZWQgXCIke25hbWV9XCJgKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIC8vIGF1dG9wdWJsaXNoXG4gIGlmIChQYWNrYWdlLmF1dG9wdWJsaXNoICYmICFvcHRpb25zLl9wcmV2ZW50QXV0b3B1Ymxpc2ggJiYgc2VsZi5fY29ubmVjdGlvbiAmJiBzZWxmLl9jb25uZWN0aW9uLnB1Ymxpc2gpIHtcbiAgICBzZWxmLl9jb25uZWN0aW9uLnB1Ymxpc2gobnVsbCwgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHNlbGYuZmluZCgpO1xuICAgIH0sIHtpc19hdXRvOiB0cnVlfSk7XG4gIH1cbn07XG5cbi8vL1xuLy8vIE1haW4gY29sbGVjdGlvbiBBUElcbi8vL1xuXG5cbl8uZXh0ZW5kKE1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlLCB7XG5cbiAgX2dldEZpbmRTZWxlY3RvcjogZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT0gMClcbiAgICAgIHJldHVybiB7fTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgfSxcblxuICBfZ2V0RmluZE9wdGlvbnM6IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChhcmdzLmxlbmd0aCA8IDIpIHtcbiAgICAgIHJldHVybiB7IHRyYW5zZm9ybTogc2VsZi5fdHJhbnNmb3JtIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoZWNrKGFyZ3NbMV0sIE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG4gICAgICAgIGZpZWxkczogTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoT2JqZWN0LCB1bmRlZmluZWQpKSxcbiAgICAgICAgc29ydDogTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoT2JqZWN0LCBBcnJheSwgRnVuY3Rpb24sIHVuZGVmaW5lZCkpLFxuICAgICAgICBsaW1pdDogTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoTnVtYmVyLCB1bmRlZmluZWQpKSxcbiAgICAgICAgc2tpcDogTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoTnVtYmVyLCB1bmRlZmluZWQpKVxuICAgICB9KSkpO1xuXG4gICAgICByZXR1cm4gXy5leHRlbmQoe1xuICAgICAgICB0cmFuc2Zvcm06IHNlbGYuX3RyYW5zZm9ybVxuICAgICAgfSwgYXJnc1sxXSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBGaW5kIHRoZSBkb2N1bWVudHMgaW4gYSBjb2xsZWN0aW9uIHRoYXQgbWF0Y2ggdGhlIHNlbGVjdG9yLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBmaW5kXG4gICAqIEBtZW1iZXJPZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IFtzZWxlY3Rvcl0gQSBxdWVyeSBkZXNjcmliaW5nIHRoZSBkb2N1bWVudHMgdG8gZmluZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7TW9uZ29Tb3J0U3BlY2lmaWVyfSBvcHRpb25zLnNvcnQgU29ydCBvcmRlciAoZGVmYXVsdDogbmF0dXJhbCBvcmRlcilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMuc2tpcCBOdW1iZXIgb2YgcmVzdWx0cyB0byBza2lwIGF0IHRoZSBiZWdpbm5pbmdcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMubGltaXQgTWF4aW11bSBudW1iZXIgb2YgcmVzdWx0cyB0byByZXR1cm5cbiAgICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnJlYWN0aXZlIChDbGllbnQgb25seSkgRGVmYXVsdCBgdHJ1ZWA7IHBhc3MgYGZhbHNlYCB0byBkaXNhYmxlIHJlYWN0aXZpdHlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gT3ZlcnJpZGVzIGB0cmFuc2Zvcm1gIG9uIHRoZSAgW2BDb2xsZWN0aW9uYF0oI2NvbGxlY3Rpb25zKSBmb3IgdGhpcyBjdXJzb3IuICBQYXNzIGBudWxsYCB0byBkaXNhYmxlIHRyYW5zZm9ybWF0aW9uLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuZGlzYWJsZU9wbG9nIChTZXJ2ZXIgb25seSkgUGFzcyB0cnVlIHRvIGRpc2FibGUgb3Bsb2ctdGFpbGluZyBvbiB0aGlzIHF1ZXJ5LiBUaGlzIGFmZmVjdHMgdGhlIHdheSBzZXJ2ZXIgcHJvY2Vzc2VzIGNhbGxzIHRvIGBvYnNlcnZlYCBvbiB0aGlzIHF1ZXJ5LiBEaXNhYmxpbmcgdGhlIG9wbG9nIGNhbiBiZSB1c2VmdWwgd2hlbiB3b3JraW5nIHdpdGggZGF0YSB0aGF0IHVwZGF0ZXMgaW4gbGFyZ2UgYmF0Y2hlcy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMucG9sbGluZ0ludGVydmFsTXMgKFNlcnZlciBvbmx5KSBXaGVuIG9wbG9nIGlzIGRpc2FibGVkICh0aHJvdWdoIHRoZSB1c2Ugb2YgYGRpc2FibGVPcGxvZ2Agb3Igd2hlbiBvdGhlcndpc2Ugbm90IGF2YWlsYWJsZSksIHRoZSBmcmVxdWVuY3kgKGluIG1pbGxpc2Vjb25kcykgb2YgaG93IG9mdGVuIHRvIHBvbGwgdGhpcyBxdWVyeSB3aGVuIG9ic2VydmluZyBvbiB0aGUgc2VydmVyLiBEZWZhdWx0cyB0byAxMDAwMG1zICgxMCBzZWNvbmRzKS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMucG9sbGluZ1Rocm90dGxlTXMgKFNlcnZlciBvbmx5KSBXaGVuIG9wbG9nIGlzIGRpc2FibGVkICh0aHJvdWdoIHRoZSB1c2Ugb2YgYGRpc2FibGVPcGxvZ2Agb3Igd2hlbiBvdGhlcndpc2Ugbm90IGF2YWlsYWJsZSksIHRoZSBtaW5pbXVtIHRpbWUgKGluIG1pbGxpc2Vjb25kcykgdG8gYWxsb3cgYmV0d2VlbiByZS1wb2xsaW5nIHdoZW4gb2JzZXJ2aW5nIG9uIHRoZSBzZXJ2ZXIuIEluY3JlYXNpbmcgdGhpcyB3aWxsIHNhdmUgQ1BVIGFuZCBtb25nbyBsb2FkIGF0IHRoZSBleHBlbnNlIG9mIHNsb3dlciB1cGRhdGVzIHRvIHVzZXJzLiBEZWNyZWFzaW5nIHRoaXMgaXMgbm90IHJlY29tbWVuZGVkLiBEZWZhdWx0cyB0byA1MG1zLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5tYXhUaW1lTXMgKFNlcnZlciBvbmx5KSBJZiBzZXQsIGluc3RydWN0cyBNb25nb0RCIHRvIHNldCBhIHRpbWUgbGltaXQgZm9yIHRoaXMgY3Vyc29yJ3Mgb3BlcmF0aW9ucy4gSWYgdGhlIG9wZXJhdGlvbiByZWFjaGVzIHRoZSBzcGVjaWZpZWQgdGltZSBsaW1pdCAoaW4gbWlsbGlzZWNvbmRzKSB3aXRob3V0IHRoZSBoYXZpbmcgYmVlbiBjb21wbGV0ZWQsIGFuIGV4Y2VwdGlvbiB3aWxsIGJlIHRocm93bi4gVXNlZnVsIHRvIHByZXZlbnQgYW4gKGFjY2lkZW50YWwgb3IgbWFsaWNpb3VzKSB1bm9wdGltaXplZCBxdWVyeSBmcm9tIGNhdXNpbmcgYSBmdWxsIGNvbGxlY3Rpb24gc2NhbiB0aGF0IHdvdWxkIGRpc3J1cHQgb3RoZXIgZGF0YWJhc2UgdXNlcnMsIGF0IHRoZSBleHBlbnNlIG9mIG5lZWRpbmcgdG8gaGFuZGxlIHRoZSByZXN1bHRpbmcgZXJyb3IuXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gb3B0aW9ucy5oaW50IChTZXJ2ZXIgb25seSkgT3ZlcnJpZGVzIE1vbmdvREIncyBkZWZhdWx0IGluZGV4IHNlbGVjdGlvbiBhbmQgcXVlcnkgb3B0aW1pemF0aW9uIHByb2Nlc3MuIFNwZWNpZnkgYW4gaW5kZXggdG8gZm9yY2UgaXRzIHVzZSwgZWl0aGVyIGJ5IGl0cyBuYW1lIG9yIGluZGV4IHNwZWNpZmljYXRpb24uIFlvdSBjYW4gYWxzbyBzcGVjaWZ5IGB7ICRuYXR1cmFsIDogMSB9YCB0byBmb3JjZSBhIGZvcndhcmRzIGNvbGxlY3Rpb24gc2Nhbiwgb3IgYHsgJG5hdHVyYWwgOiAtMSB9YCBmb3IgYSByZXZlcnNlIGNvbGxlY3Rpb24gc2Nhbi4gU2V0dGluZyB0aGlzIGlzIG9ubHkgcmVjb21tZW5kZWQgZm9yIGFkdmFuY2VkIHVzZXJzLlxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ3Vyc29yfVxuICAgKi9cbiAgZmluZDogZnVuY3Rpb24gKC8qIHNlbGVjdG9yLCBvcHRpb25zICovKSB7XG4gICAgLy8gQ29sbGVjdGlvbi5maW5kKCkgKHJldHVybiBhbGwgZG9jcykgYmVoYXZlcyBkaWZmZXJlbnRseVxuICAgIC8vIGZyb20gQ29sbGVjdGlvbi5maW5kKHVuZGVmaW5lZCkgKHJldHVybiAwIGRvY3MpLiAgc28gYmVcbiAgICAvLyBjYXJlZnVsIGFib3V0IHRoZSBsZW5ndGggb2YgYXJndW1lbnRzLlxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgYXJnQXJyYXkgPSBfLnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICByZXR1cm4gc2VsZi5fY29sbGVjdGlvbi5maW5kKHNlbGYuX2dldEZpbmRTZWxlY3RvcihhcmdBcnJheSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9nZXRGaW5kT3B0aW9ucyhhcmdBcnJheSkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBGaW5kcyB0aGUgZmlyc3QgZG9jdW1lbnQgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3RvciwgYXMgb3JkZXJlZCBieSBzb3J0IGFuZCBza2lwIG9wdGlvbnMuIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnQgaXMgZm91bmQuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIGZpbmRPbmVcbiAgICogQG1lbWJlck9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gW3NlbGVjdG9yXSBBIHF1ZXJ5IGRlc2NyaWJpbmcgdGhlIGRvY3VtZW50cyB0byBmaW5kXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtNb25nb1NvcnRTcGVjaWZpZXJ9IG9wdGlvbnMuc29ydCBTb3J0IG9yZGVyIChkZWZhdWx0OiBuYXR1cmFsIG9yZGVyKVxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5za2lwIE51bWJlciBvZiByZXN1bHRzIHRvIHNraXAgYXQgdGhlIGJlZ2lubmluZ1xuICAgKiBAcGFyYW0ge01vbmdvRmllbGRTcGVjaWZpZXJ9IG9wdGlvbnMuZmllbGRzIERpY3Rpb25hcnkgb2YgZmllbGRzIHRvIHJldHVybiBvciBleGNsdWRlLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMucmVhY3RpdmUgKENsaWVudCBvbmx5KSBEZWZhdWx0IHRydWU7IHBhc3MgZmFsc2UgdG8gZGlzYWJsZSByZWFjdGl2aXR5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMudHJhbnNmb3JtIE92ZXJyaWRlcyBgdHJhbnNmb3JtYCBvbiB0aGUgW2BDb2xsZWN0aW9uYF0oI2NvbGxlY3Rpb25zKSBmb3IgdGhpcyBjdXJzb3IuICBQYXNzIGBudWxsYCB0byBkaXNhYmxlIHRyYW5zZm9ybWF0aW9uLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZmluZE9uZTogZnVuY3Rpb24gKC8qIHNlbGVjdG9yLCBvcHRpb25zICovKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBhcmdBcnJheSA9IF8udG9BcnJheShhcmd1bWVudHMpO1xuICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLmZpbmRPbmUoc2VsZi5fZ2V0RmluZFNlbGVjdG9yKGFyZ0FycmF5KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX2dldEZpbmRPcHRpb25zKGFyZ0FycmF5KSk7XG4gIH1cblxufSk7XG5cbk1vbmdvLkNvbGxlY3Rpb24uX3B1Ymxpc2hDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBzdWIsIGNvbGxlY3Rpb24pIHtcbiAgdmFyIG9ic2VydmVIYW5kbGUgPSBjdXJzb3Iub2JzZXJ2ZUNoYW5nZXMoe1xuICAgIGFkZGVkOiBmdW5jdGlvbiAoaWQsIGZpZWxkcykge1xuICAgICAgc3ViLmFkZGVkKGNvbGxlY3Rpb24sIGlkLCBmaWVsZHMpO1xuICAgIH0sXG4gICAgY2hhbmdlZDogZnVuY3Rpb24gKGlkLCBmaWVsZHMpIHtcbiAgICAgIHN1Yi5jaGFuZ2VkKGNvbGxlY3Rpb24sIGlkLCBmaWVsZHMpO1xuICAgIH0sXG4gICAgcmVtb3ZlZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICBzdWIucmVtb3ZlZChjb2xsZWN0aW9uLCBpZCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBXZSBkb24ndCBjYWxsIHN1Yi5yZWFkeSgpIGhlcmU6IGl0IGdldHMgY2FsbGVkIGluIGxpdmVkYXRhX3NlcnZlciwgYWZ0ZXJcbiAgLy8gcG9zc2libHkgY2FsbGluZyBfcHVibGlzaEN1cnNvciBvbiBtdWx0aXBsZSByZXR1cm5lZCBjdXJzb3JzLlxuXG4gIC8vIHJlZ2lzdGVyIHN0b3AgY2FsbGJhY2sgKGV4cGVjdHMgbGFtYmRhIHcvIG5vIGFyZ3MpLlxuICBzdWIub25TdG9wKGZ1bmN0aW9uICgpIHtvYnNlcnZlSGFuZGxlLnN0b3AoKTt9KTtcblxuICAvLyByZXR1cm4gdGhlIG9ic2VydmVIYW5kbGUgaW4gY2FzZSBpdCBuZWVkcyB0byBiZSBzdG9wcGVkIGVhcmx5XG4gIHJldHVybiBvYnNlcnZlSGFuZGxlO1xufTtcblxuLy8gcHJvdGVjdCBhZ2FpbnN0IGRhbmdlcm91cyBzZWxlY3RvcnMuICBmYWxzZXkgYW5kIHtfaWQ6IGZhbHNleX0gYXJlIGJvdGhcbi8vIGxpa2VseSBwcm9ncmFtbWVyIGVycm9yLCBhbmQgbm90IHdoYXQgeW91IHdhbnQsIHBhcnRpY3VsYXJseSBmb3IgZGVzdHJ1Y3RpdmVcbi8vIG9wZXJhdGlvbnMuIElmIGEgZmFsc2V5IF9pZCBpcyBzZW50IGluLCBhIG5ldyBzdHJpbmcgX2lkIHdpbGwgYmVcbi8vIGdlbmVyYXRlZCBhbmQgcmV0dXJuZWQ7IGlmIGEgZmFsbGJhY2tJZCBpcyBwcm92aWRlZCwgaXQgd2lsbCBiZSByZXR1cm5lZFxuLy8gaW5zdGVhZC5cbk1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvciA9IChzZWxlY3RvciwgeyBmYWxsYmFja0lkIH0gPSB7fSkgPT4ge1xuICAvLyBzaG9ydGhhbmQgLS0gc2NhbGFycyBtYXRjaCBfaWRcbiAgaWYgKExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHNlbGVjdG9yKSlcbiAgICBzZWxlY3RvciA9IHtfaWQ6IHNlbGVjdG9yfTtcblxuICBpZiAoXy5pc0FycmF5KHNlbGVjdG9yKSkge1xuICAgIC8vIFRoaXMgaXMgY29uc2lzdGVudCB3aXRoIHRoZSBNb25nbyBjb25zb2xlIGl0c2VsZjsgaWYgd2UgZG9uJ3QgZG8gdGhpc1xuICAgIC8vIGNoZWNrIHBhc3NpbmcgYW4gZW1wdHkgYXJyYXkgZW5kcyB1cCBzZWxlY3RpbmcgYWxsIGl0ZW1zXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTW9uZ28gc2VsZWN0b3IgY2FuJ3QgYmUgYW4gYXJyYXkuXCIpO1xuICB9XG5cbiAgaWYgKCFzZWxlY3RvciB8fCAoKCdfaWQnIGluIHNlbGVjdG9yKSAmJiAhc2VsZWN0b3IuX2lkKSkge1xuICAgIC8vIGNhbid0IG1hdGNoIGFueXRoaW5nXG4gICAgcmV0dXJuIHsgX2lkOiBmYWxsYmFja0lkIHx8IFJhbmRvbS5pZCgpIH07XG4gIH1cblxuICByZXR1cm4gc2VsZWN0b3I7XG59O1xuXG4vLyAnaW5zZXJ0JyBpbW1lZGlhdGVseSByZXR1cm5zIHRoZSBpbnNlcnRlZCBkb2N1bWVudCdzIG5ldyBfaWQuXG4vLyBUaGUgb3RoZXJzIHJldHVybiB2YWx1ZXMgaW1tZWRpYXRlbHkgaWYgeW91IGFyZSBpbiBhIHN0dWIsIGFuIGluLW1lbW9yeVxuLy8gdW5tYW5hZ2VkIGNvbGxlY3Rpb24sIG9yIGEgbW9uZ28tYmFja2VkIGNvbGxlY3Rpb24gYW5kIHlvdSBkb24ndCBwYXNzIGFcbi8vIGNhbGxiYWNrLiAndXBkYXRlJyBhbmQgJ3JlbW92ZScgcmV0dXJuIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWRcbi8vIGRvY3VtZW50cy4gJ3Vwc2VydCcgcmV0dXJucyBhbiBvYmplY3Qgd2l0aCBrZXlzICdudW1iZXJBZmZlY3RlZCcgYW5kLCBpZiBhblxuLy8gaW5zZXJ0IGhhcHBlbmVkLCAnaW5zZXJ0ZWRJZCcuXG4vL1xuLy8gT3RoZXJ3aXNlLCB0aGUgc2VtYW50aWNzIGFyZSBleGFjdGx5IGxpa2Ugb3RoZXIgbWV0aG9kczogdGhleSB0YWtlXG4vLyBhIGNhbGxiYWNrIGFzIGFuIG9wdGlvbmFsIGxhc3QgYXJndW1lbnQ7IGlmIG5vIGNhbGxiYWNrIGlzXG4vLyBwcm92aWRlZCwgdGhleSBibG9jayB1bnRpbCB0aGUgb3BlcmF0aW9uIGlzIGNvbXBsZXRlLCBhbmQgdGhyb3cgYW5cbi8vIGV4Y2VwdGlvbiBpZiBpdCBmYWlsczsgaWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCwgdGhlbiB0aGV5IGRvbid0XG4vLyBuZWNlc3NhcmlseSBibG9jaywgYW5kIHRoZXkgY2FsbCB0aGUgY2FsbGJhY2sgd2hlbiB0aGV5IGZpbmlzaCB3aXRoIGVycm9yIGFuZFxuLy8gcmVzdWx0IGFyZ3VtZW50cy4gIChUaGUgaW5zZXJ0IG1ldGhvZCBwcm92aWRlcyB0aGUgZG9jdW1lbnQgSUQgYXMgaXRzIHJlc3VsdDtcbi8vIHVwZGF0ZSBhbmQgcmVtb3ZlIHByb3ZpZGUgdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2NzIGFzIHRoZSByZXN1bHQ7IHVwc2VydFxuLy8gcHJvdmlkZXMgYW4gb2JqZWN0IHdpdGggbnVtYmVyQWZmZWN0ZWQgYW5kIG1heWJlIGluc2VydGVkSWQuKVxuLy9cbi8vIE9uIHRoZSBjbGllbnQsIGJsb2NraW5nIGlzIGltcG9zc2libGUsIHNvIGlmIGEgY2FsbGJhY2tcbi8vIGlzbid0IHByb3ZpZGVkLCB0aGV5IGp1c3QgcmV0dXJuIGltbWVkaWF0ZWx5IGFuZCBhbnkgZXJyb3Jcbi8vIGluZm9ybWF0aW9uIGlzIGxvc3QuXG4vL1xuLy8gVGhlcmUncyBvbmUgbW9yZSB0d2Vhay4gT24gdGhlIGNsaWVudCwgaWYgeW91IGRvbid0IHByb3ZpZGUgYVxuLy8gY2FsbGJhY2ssIHRoZW4gaWYgdGhlcmUgaXMgYW4gZXJyb3IsIGEgbWVzc2FnZSB3aWxsIGJlIGxvZ2dlZCB3aXRoXG4vLyBNZXRlb3IuX2RlYnVnLlxuLy9cbi8vIFRoZSBpbnRlbnQgKHRob3VnaCB0aGlzIGlzIGFjdHVhbGx5IGRldGVybWluZWQgYnkgdGhlIHVuZGVybHlpbmdcbi8vIGRyaXZlcnMpIGlzIHRoYXQgdGhlIG9wZXJhdGlvbnMgc2hvdWxkIGJlIGRvbmUgc3luY2hyb25vdXNseSwgbm90XG4vLyBnZW5lcmF0aW5nIHRoZWlyIHJlc3VsdCB1bnRpbCB0aGUgZGF0YWJhc2UgaGFzIGFja25vd2xlZGdlZFxuLy8gdGhlbS4gSW4gdGhlIGZ1dHVyZSBtYXliZSB3ZSBzaG91bGQgcHJvdmlkZSBhIGZsYWcgdG8gdHVybiB0aGlzXG4vLyBvZmYuXG5cbi8qKlxuICogQHN1bW1hcnkgSW5zZXJ0IGEgZG9jdW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24uICBSZXR1cm5zIGl0cyB1bmlxdWUgX2lkLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAbWV0aG9kICBpbnNlcnRcbiAqIEBtZW1iZXJPZiBNb25nby5Db2xsZWN0aW9uXG4gKiBAaW5zdGFuY2VcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIGluc2VydC4gTWF5IG5vdCB5ZXQgaGF2ZSBhbiBfaWQgYXR0cmlidXRlLCBpbiB3aGljaCBjYXNlIE1ldGVvciB3aWxsIGdlbmVyYXRlIG9uZSBmb3IgeW91LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBPcHRpb25hbC4gIElmIHByZXNlbnQsIGNhbGxlZCB3aXRoIGFuIGVycm9yIG9iamVjdCBhcyB0aGUgZmlyc3QgYXJndW1lbnQgYW5kLCBpZiBubyBlcnJvciwgdGhlIF9pZCBhcyB0aGUgc2Vjb25kLlxuICovXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiBpbnNlcnQoZG9jLCBjYWxsYmFjaykge1xuICAvLyBNYWtlIHN1cmUgd2Ugd2VyZSBwYXNzZWQgYSBkb2N1bWVudCB0byBpbnNlcnRcbiAgaWYgKCFkb2MpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgcmVxdWlyZXMgYW4gYXJndW1lbnRcIik7XG4gIH1cblxuICAvLyBNYWtlIGEgc2hhbGxvdyBjbG9uZSBvZiB0aGUgZG9jdW1lbnQsIHByZXNlcnZpbmcgaXRzIHByb3RvdHlwZS5cbiAgZG9jID0gT2JqZWN0LmNyZWF0ZShcbiAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZG9jKSxcbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhkb2MpXG4gICk7XG5cbiAgaWYgKCdfaWQnIGluIGRvYykge1xuICAgIGlmICghIGRvYy5faWQgfHxcbiAgICAgICAgISAodHlwZW9mIGRvYy5faWQgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgIGRvYy5faWQgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJNZXRlb3IgcmVxdWlyZXMgZG9jdW1lbnQgX2lkIGZpZWxkcyB0byBiZSBub24tZW1wdHkgc3RyaW5ncyBvciBPYmplY3RJRHNcIik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxldCBnZW5lcmF0ZUlkID0gdHJ1ZTtcblxuICAgIC8vIERvbid0IGdlbmVyYXRlIHRoZSBpZCBpZiB3ZSdyZSB0aGUgY2xpZW50IGFuZCB0aGUgJ291dGVybW9zdCcgY2FsbFxuICAgIC8vIFRoaXMgb3B0aW1pemF0aW9uIHNhdmVzIHVzIHBhc3NpbmcgYm90aCB0aGUgcmFuZG9tU2VlZCBhbmQgdGhlIGlkXG4gICAgLy8gUGFzc2luZyBib3RoIGlzIHJlZHVuZGFudC5cbiAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgIGNvbnN0IGVuY2xvc2luZyA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24uZ2V0KCk7XG4gICAgICBpZiAoIWVuY2xvc2luZykge1xuICAgICAgICBnZW5lcmF0ZUlkID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGdlbmVyYXRlSWQpIHtcbiAgICAgIGRvYy5faWQgPSB0aGlzLl9tYWtlTmV3SUQoKTtcbiAgICB9XG4gIH1cblxuICAvLyBPbiBpbnNlcnRzLCBhbHdheXMgcmV0dXJuIHRoZSBpZCB0aGF0IHdlIGdlbmVyYXRlZDsgb24gYWxsIG90aGVyXG4gIC8vIG9wZXJhdGlvbnMsIGp1c3QgcmV0dXJuIHRoZSByZXN1bHQgZnJvbSB0aGUgY29sbGVjdGlvbi5cbiAgdmFyIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQgPSBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgaWYgKGRvYy5faWQpIHtcbiAgICAgIHJldHVybiBkb2MuX2lkO1xuICAgIH1cblxuICAgIC8vIFhYWCB3aGF0IGlzIHRoaXMgZm9yPz9cbiAgICAvLyBJdCdzIHNvbWUgaXRlcmFjdGlvbiBiZXR3ZWVuIHRoZSBjYWxsYmFjayB0byBfY2FsbE11dGF0b3JNZXRob2QgYW5kXG4gICAgLy8gdGhlIHJldHVybiB2YWx1ZSBjb252ZXJzaW9uXG4gICAgZG9jLl9pZCA9IHJlc3VsdDtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgY29uc3Qgd3JhcHBlZENhbGxiYWNrID0gd3JhcENhbGxiYWNrKGNhbGxiYWNrLCBjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0KTtcblxuICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9jYWxsTXV0YXRvck1ldGhvZChcImluc2VydFwiLCBbZG9jXSwgd3JhcHBlZENhbGxiYWNrKTtcbiAgICByZXR1cm4gY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdChyZXN1bHQpO1xuICB9XG5cbiAgLy8gaXQncyBteSBjb2xsZWN0aW9uLiAgZGVzY2VuZCBpbnRvIHRoZSBjb2xsZWN0aW9uIG9iamVjdFxuICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gIHRyeSB7XG4gICAgLy8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYSBjYWxsYmFjayBhbmQgdGhlIGNvbGxlY3Rpb24gaW1wbGVtZW50cyB0aGlzXG4gICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9jb2xsZWN0aW9uLmluc2VydChkb2MsIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgcmV0dXJuIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQocmVzdWx0KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soZSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBNb2RpZnkgb25lIG9yIG1vcmUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgbWF0Y2hlZCBkb2N1bWVudHMuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBtZXRob2QgdXBkYXRlXG4gKiBAbWVtYmVyT2YgTW9uZ28uQ29sbGVjdGlvblxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gbW9kaWZ5XG4gKiBAcGFyYW0ge01vbmdvTW9kaWZpZXJ9IG1vZGlmaWVyIFNwZWNpZmllcyBob3cgdG8gbW9kaWZ5IHRoZSBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5tdWx0aSBUcnVlIHRvIG1vZGlmeSBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzOyBmYWxzZSB0byBvbmx5IG1vZGlmeSBvbmUgb2YgdGhlIG1hdGNoaW5nIGRvY3VtZW50cyAodGhlIGRlZmF1bHQpLlxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnVwc2VydCBUcnVlIHRvIGluc2VydCBhIGRvY3VtZW50IGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50cyBhcmUgZm91bmQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3VtZW50cyBhcyB0aGUgc2Vjb25kLlxuICovXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoc2VsZWN0b3IsIG1vZGlmaWVyLCAuLi5vcHRpb25zQW5kQ2FsbGJhY2spIHtcbiAgY29uc3QgY2FsbGJhY2sgPSBwb3BDYWxsYmFja0Zyb21BcmdzKG9wdGlvbnNBbmRDYWxsYmFjayk7XG5cbiAgLy8gV2UndmUgYWxyZWFkeSBwb3BwZWQgb2ZmIHRoZSBjYWxsYmFjaywgc28gd2UgYXJlIGxlZnQgd2l0aCBhbiBhcnJheVxuICAvLyBvZiBvbmUgb3IgemVybyBpdGVtc1xuICBjb25zdCBvcHRpb25zID0gXy5jbG9uZShvcHRpb25zQW5kQ2FsbGJhY2tbMF0pIHx8IHt9O1xuICBsZXQgaW5zZXJ0ZWRJZDtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy51cHNlcnQpIHtcbiAgICAvLyBzZXQgYGluc2VydGVkSWRgIGlmIGFic2VudC4gIGBpbnNlcnRlZElkYCBpcyBhIE1ldGVvciBleHRlbnNpb24uXG4gICAgaWYgKG9wdGlvbnMuaW5zZXJ0ZWRJZCkge1xuICAgICAgaWYgKCEodHlwZW9mIG9wdGlvbnMuaW5zZXJ0ZWRJZCA9PT0gJ3N0cmluZycgfHwgb3B0aW9ucy5pbnNlcnRlZElkIGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnRlZElkIG11c3QgYmUgc3RyaW5nIG9yIE9iamVjdElEXCIpO1xuICAgICAgaW5zZXJ0ZWRJZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDtcbiAgICB9IGVsc2UgaWYgKCFzZWxlY3RvciB8fCAhc2VsZWN0b3IuX2lkKSB7XG4gICAgICBpbnNlcnRlZElkID0gdGhpcy5fbWFrZU5ld0lEKCk7XG4gICAgICBvcHRpb25zLmdlbmVyYXRlZElkID0gdHJ1ZTtcbiAgICAgIG9wdGlvbnMuaW5zZXJ0ZWRJZCA9IGluc2VydGVkSWQ7XG4gICAgfVxuICB9XG5cbiAgc2VsZWN0b3IgPVxuICAgIE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3RvciwgeyBmYWxsYmFja0lkOiBpbnNlcnRlZElkIH0pO1xuXG4gIGNvbnN0IHdyYXBwZWRDYWxsYmFjayA9IHdyYXBDYWxsYmFjayhjYWxsYmFjayk7XG5cbiAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgY29uc3QgYXJncyA9IFtcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgbW9kaWZpZXIsXG4gICAgICBvcHRpb25zXG4gICAgXTtcblxuICAgIHJldHVybiB0aGlzLl9jYWxsTXV0YXRvck1ldGhvZChcInVwZGF0ZVwiLCBhcmdzLCB3cmFwcGVkQ2FsbGJhY2spO1xuICB9XG5cbiAgLy8gaXQncyBteSBjb2xsZWN0aW9uLiAgZGVzY2VuZCBpbnRvIHRoZSBjb2xsZWN0aW9uIG9iamVjdFxuICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gIHRyeSB7XG4gICAgLy8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYSBjYWxsYmFjayBhbmQgdGhlIGNvbGxlY3Rpb24gaW1wbGVtZW50cyB0aGlzXG4gICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi51cGRhdGUoXG4gICAgICBzZWxlY3RvciwgbW9kaWZpZXIsIG9wdGlvbnMsIHdyYXBwZWRDYWxsYmFjayk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKGUpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cbn07XG5cbi8qKlxuICogQHN1bW1hcnkgUmVtb3ZlIGRvY3VtZW50cyBmcm9tIHRoZSBjb2xsZWN0aW9uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBtZXRob2QgcmVtb3ZlXG4gKiBAbWVtYmVyT2YgTW9uZ28uQ29sbGVjdGlvblxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gcmVtb3ZlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIGl0cyBhcmd1bWVudC5cbiAqL1xuTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICBzZWxlY3RvciA9IE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgY29uc3Qgd3JhcHBlZENhbGxiYWNrID0gd3JhcENhbGxiYWNrKGNhbGxiYWNrKTtcblxuICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoXCJyZW1vdmVcIiwgW3NlbGVjdG9yXSwgd3JhcHBlZENhbGxiYWNrKTtcbiAgfVxuXG4gIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbiBvYmplY3RcbiAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICB0cnkge1xuICAgIC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgY2FsbGJhY2sgYW5kIHRoZSBjb2xsZWN0aW9uIGltcGxlbWVudHMgdGhpc1xuICAgIC8vIG9wZXJhdGlvbiBhc3luY2hyb25vdXNseSwgdGhlbiBxdWVyeVJldCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgIC8vIHJlc3VsdCB3aWxsIGJlIHJldHVybmVkIHRocm91Z2ggdGhlIGNhbGxiYWNrIGluc3RlYWQuXG4gICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24ucmVtb3ZlKHNlbGVjdG9yLCB3cmFwcGVkQ2FsbGJhY2spO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhlKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9XG59O1xuXG4vLyBEZXRlcm1pbmUgaWYgdGhpcyBjb2xsZWN0aW9uIGlzIHNpbXBseSBhIG1pbmltb25nbyByZXByZXNlbnRhdGlvbiBvZiBhIHJlYWxcbi8vIGRhdGFiYXNlIG9uIGFub3RoZXIgc2VydmVyXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS5faXNSZW1vdGVDb2xsZWN0aW9uID0gZnVuY3Rpb24gX2lzUmVtb3RlQ29sbGVjdGlvbigpIHtcbiAgLy8gWFhYIHNlZSAjTWV0ZW9yU2VydmVyTnVsbFxuICByZXR1cm4gdGhpcy5fY29ubmVjdGlvbiAmJiB0aGlzLl9jb25uZWN0aW9uICE9PSBNZXRlb3Iuc2VydmVyO1xufTtcblxuLy8gQ29udmVydCB0aGUgY2FsbGJhY2sgdG8gbm90IHJldHVybiBhIHJlc3VsdCBpZiB0aGVyZSBpcyBhbiBlcnJvclxuZnVuY3Rpb24gd3JhcENhbGxiYWNrKGNhbGxiYWNrLCBjb252ZXJ0UmVzdWx0KSB7XG4gIGlmICghY2FsbGJhY2spIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBJZiBubyBjb252ZXJ0IGZ1bmN0aW9uIHdhcyBwYXNzZWQgaW4sIGp1c3QgdXNlIGEgXCJibGFuayBmdW5jdGlvblwiXG4gIGNvbnZlcnRSZXN1bHQgPSBjb252ZXJ0UmVzdWx0IHx8IF8uaWRlbnRpdHk7XG5cbiAgcmV0dXJuIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgY2FsbGJhY2soZXJyb3IsICEgZXJyb3IgJiYgY29udmVydFJlc3VsdChyZXN1bHQpKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBNb2RpZnkgb25lIG9yIG1vcmUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLCBvciBpbnNlcnQgb25lIGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50cyB3ZXJlIGZvdW5kLiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIGtleXMgYG51bWJlckFmZmVjdGVkYCAodGhlIG51bWJlciBvZiBkb2N1bWVudHMgbW9kaWZpZWQpICBhbmQgYGluc2VydGVkSWRgICh0aGUgdW5pcXVlIF9pZCBvZiB0aGUgZG9jdW1lbnQgdGhhdCB3YXMgaW5zZXJ0ZWQsIGlmIGFueSkuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byBtb2RpZnlcbiAqIEBwYXJhbSB7TW9uZ29Nb2RpZmllcn0gbW9kaWZpZXIgU3BlY2lmaWVzIGhvdyB0byBtb2RpZnkgdGhlIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLm11bHRpIFRydWUgdG8gbW9kaWZ5IGFsbCBtYXRjaGluZyBkb2N1bWVudHM7IGZhbHNlIHRvIG9ubHkgbW9kaWZ5IG9uZSBvZiB0aGUgbWF0Y2hpbmcgZG9jdW1lbnRzICh0aGUgZGVmYXVsdCkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3VtZW50cyBhcyB0aGUgc2Vjb25kLlxuICovXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS51cHNlcnQgPSBmdW5jdGlvbiB1cHNlcnQoXG4gICAgc2VsZWN0b3IsIG1vZGlmaWVyLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICBpZiAoISBjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuXG4gIGNvbnN0IHVwZGF0ZU9wdGlvbnMgPSBfLmV4dGVuZCh7fSwgb3B0aW9ucywge1xuICAgIF9yZXR1cm5PYmplY3Q6IHRydWUsXG4gICAgdXBzZXJ0OiB0cnVlXG4gIH0pO1xuXG4gIHJldHVybiB0aGlzLnVwZGF0ZShzZWxlY3RvciwgbW9kaWZpZXIsIHVwZGF0ZU9wdGlvbnMsIGNhbGxiYWNrKTtcbn07XG5cbi8vIFdlJ2xsIGFjdHVhbGx5IGRlc2lnbiBhbiBpbmRleCBBUEkgbGF0ZXIuIEZvciBub3csIHdlIGp1c3QgcGFzcyB0aHJvdWdoIHRvXG4vLyBNb25nbydzLCBidXQgbWFrZSBpdCBzeW5jaHJvbm91cy5cbk1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlLl9lbnN1cmVJbmRleCA9IGZ1bmN0aW9uIChpbmRleCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghc2VsZi5fY29sbGVjdGlvbi5fZW5zdXJlSW5kZXgpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgY2FsbCBfZW5zdXJlSW5kZXggb24gc2VydmVyIGNvbGxlY3Rpb25zXCIpO1xuICBzZWxmLl9jb2xsZWN0aW9uLl9lbnN1cmVJbmRleChpbmRleCwgb3B0aW9ucyk7XG59O1xuTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUuX2Ryb3BJbmRleCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghc2VsZi5fY29sbGVjdGlvbi5fZHJvcEluZGV4KVxuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2Ryb3BJbmRleCBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gIHNlbGYuX2NvbGxlY3Rpb24uX2Ryb3BJbmRleChpbmRleCk7XG59O1xuTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUuX2Ryb3BDb2xsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghc2VsZi5fY29sbGVjdGlvbi5kcm9wQ29sbGVjdGlvbilcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIF9kcm9wQ29sbGVjdGlvbiBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gIHNlbGYuX2NvbGxlY3Rpb24uZHJvcENvbGxlY3Rpb24oKTtcbn07XG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS5fY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChieXRlU2l6ZSwgbWF4RG9jdW1lbnRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24gb24gc2VydmVyIGNvbGxlY3Rpb25zXCIpO1xuICBzZWxmLl9jb2xsZWN0aW9uLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uKGJ5dGVTaXplLCBtYXhEb2N1bWVudHMpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBbYENvbGxlY3Rpb25gXShodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS8yLjIvYXBpL0NvbGxlY3Rpb24uaHRtbCkgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBjb2xsZWN0aW9uIGZyb20gdGhlIFtucG0gYG1vbmdvZGJgIGRyaXZlciBtb2R1bGVdKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL21vbmdvZGIpIHdoaWNoIGlzIHdyYXBwZWQgYnkgYE1vbmdvLkNvbGxlY3Rpb25gLlxuICogQGxvY3VzIFNlcnZlclxuICovXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS5yYXdDb2xsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghIHNlbGYuX2NvbGxlY3Rpb24ucmF3Q29sbGVjdGlvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgcmF3Q29sbGVjdGlvbiBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gIH1cbiAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24ucmF3Q29sbGVjdGlvbigpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBbYERiYF0oaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvMi4yL2FwaS9EYi5odG1sKSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGlzIGNvbGxlY3Rpb24ncyBkYXRhYmFzZSBjb25uZWN0aW9uIGZyb20gdGhlIFtucG0gYG1vbmdvZGJgIGRyaXZlciBtb2R1bGVdKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL21vbmdvZGIpIHdoaWNoIGlzIHdyYXBwZWQgYnkgYE1vbmdvLkNvbGxlY3Rpb25gLlxuICogQGxvY3VzIFNlcnZlclxuICovXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS5yYXdEYXRhYmFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoISAoc2VsZi5fZHJpdmVyLm1vbmdvICYmIHNlbGYuX2RyaXZlci5tb25nby5kYikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIHJhd0RhdGFiYXNlIG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgfVxuICByZXR1cm4gc2VsZi5fZHJpdmVyLm1vbmdvLmRiO1xufTtcblxuXG4vKipcbiAqIEBzdW1tYXJ5IENyZWF0ZSBhIE1vbmdvLXN0eWxlIGBPYmplY3RJRGAuICBJZiB5b3UgZG9uJ3Qgc3BlY2lmeSBhIGBoZXhTdHJpbmdgLCB0aGUgYE9iamVjdElEYCB3aWxsIGdlbmVyYXRlZCByYW5kb21seSAobm90IHVzaW5nIE1vbmdvREIncyBJRCBjb25zdHJ1Y3Rpb24gcnVsZXMpLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSB7U3RyaW5nfSBbaGV4U3RyaW5nXSBPcHRpb25hbC4gIFRoZSAyNC1jaGFyYWN0ZXIgaGV4YWRlY2ltYWwgY29udGVudHMgb2YgdGhlIE9iamVjdElEIHRvIGNyZWF0ZVxuICovXG5Nb25nby5PYmplY3RJRCA9IE1vbmdvSUQuT2JqZWN0SUQ7XG5cbi8qKlxuICogQHN1bW1hcnkgVG8gY3JlYXRlIGEgY3Vyc29yLCB1c2UgZmluZC4gVG8gYWNjZXNzIHRoZSBkb2N1bWVudHMgaW4gYSBjdXJzb3IsIHVzZSBmb3JFYWNoLCBtYXAsIG9yIGZldGNoLlxuICogQGNsYXNzXG4gKiBAaW5zdGFuY2VOYW1lIGN1cnNvclxuICovXG5Nb25nby5DdXJzb3IgPSBMb2NhbENvbGxlY3Rpb24uQ3Vyc29yO1xuXG4vKipcbiAqIEBkZXByZWNhdGVkIGluIDAuOS4xXG4gKi9cbk1vbmdvLkNvbGxlY3Rpb24uQ3Vyc29yID0gTW9uZ28uQ3Vyc29yO1xuXG4vKipcbiAqIEBkZXByZWNhdGVkIGluIDAuOS4xXG4gKi9cbk1vbmdvLkNvbGxlY3Rpb24uT2JqZWN0SUQgPSBNb25nby5PYmplY3RJRDtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuMVxuICovXG5NZXRlb3IuQ29sbGVjdGlvbiA9IE1vbmdvLkNvbGxlY3Rpb247XG5cbi8vIEFsbG93IGRlbnkgc3R1ZmYgaXMgbm93IGluIHRoZSBhbGxvdy1kZW55IHBhY2thZ2Vcbl8uZXh0ZW5kKE1ldGVvci5Db2xsZWN0aW9uLnByb3RvdHlwZSwgQWxsb3dEZW55LkNvbGxlY3Rpb25Qcm90b3R5cGUpO1xuXG5mdW5jdGlvbiBwb3BDYWxsYmFja0Zyb21BcmdzKGFyZ3MpIHtcbiAgLy8gUHVsbCBvZmYgYW55IGNhbGxiYWNrIChvciBwZXJoYXBzIGEgJ2NhbGxiYWNrJyB2YXJpYWJsZSB0aGF0IHdhcyBwYXNzZWRcbiAgLy8gaW4gdW5kZWZpbmVkLCBsaWtlIGhvdyAndXBzZXJ0JyBkb2VzIGl0KS5cbiAgaWYgKGFyZ3MubGVuZ3RoICYmXG4gICAgICAoYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSB1bmRlZmluZWQgfHxcbiAgICAgICBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICByZXR1cm4gYXJncy5wb3AoKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAc3VtbWFyeSBBbGxvd3MgZm9yIHVzZXIgc3BlY2lmaWVkIGNvbm5lY3Rpb24gb3B0aW9uc1xuICogQGV4YW1wbGUgaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvMi4yL3JlZmVyZW5jZS9jb25uZWN0aW5nL2Nvbm5lY3Rpb24tc2V0dGluZ3MvXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBVc2VyIHNwZWNpZmllZCBNb25nbyBjb25uZWN0aW9uIG9wdGlvbnNcbiAqL1xuTW9uZ28uc2V0Q29ubmVjdGlvbk9wdGlvbnMgPSBmdW5jdGlvbiBzZXRDb25uZWN0aW9uT3B0aW9ucyAob3B0aW9ucykge1xuICBjaGVjayhvcHRpb25zLCBPYmplY3QpO1xuICBNb25nby5fY29ubmVjdGlvbk9wdGlvbnMgPSBvcHRpb25zO1xufTsiXX0=
