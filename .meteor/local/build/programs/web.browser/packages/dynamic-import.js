//////////////////////////////////////////////////////////////////////////
//                                                                      //
// This is a generated file. You can view the original                  //
// source in your browser if your browser supports source maps.         //
// Source maps are supported by all recent versions of Chrome, Safari,  //
// and Firefox, and by Internet Explorer 11.                            //
//                                                                      //
//////////////////////////////////////////////////////////////////////////


(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;
var DDP = Package['ddp-client'].DDP;
var check = Package.check.check;
var Match = Package.check.Match;

var require = meteorInstall({"node_modules":{"meteor":{"dynamic-import":{"client.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/dynamic-import/client.js                                           //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
var Module = module.constructor;                                               // 1
var cache = require("./cache.js");                                             // 2
                                                                               // 3
// Call module.dynamicImport(id) to fetch a module and any/all of its          // 4
// dependencies that have not already been fetched, and evaluate them as       // 5
// soon as they arrive. This runtime API makes it very easy to implement       // 6
// ECMAScript dynamic import(...) syntax.                                      // 7
Module.prototype.dynamicImport = function (id) {                               // 8
  var module = this;                                                           // 9
  return module.prefetch(id).then(function () {                                // 10
    return getNamespace(module, id);                                           // 11
  });                                                                          // 12
};                                                                             // 13
                                                                               // 14
// Called by Module.prototype.prefetch if there are any missing dynamic        // 15
// modules that need to be fetched.                                            // 16
meteorInstall.fetch = function (ids) {                                         // 17
  var tree = Object.create(null);                                              // 18
  var versions = Object.create(null);                                          // 19
  var dynamicVersions = require("./dynamic-versions.js");                      // 20
  var missing;                                                                 // 21
                                                                               // 22
  function addSource(id, source) {                                             // 23
    addToTree(tree, id, makeModuleFunction(id, source, ids[id].options));      // 24
  }                                                                            // 25
                                                                               // 26
  function addMissing(id) {                                                    // 27
    addToTree(missing = missing || Object.create(null), id, 1);                // 28
  }                                                                            // 29
                                                                               // 30
  Object.keys(ids).forEach(function (id) {                                     // 31
    var version = dynamicVersions.get(id);                                     // 32
    if (version) {                                                             // 33
      versions[id] = version;                                                  // 34
    } else {                                                                   // 35
      addMissing(id);                                                          // 36
    }                                                                          // 37
  });                                                                          // 38
                                                                               // 39
  return cache.checkMany(versions).then(function (sources) {                   // 40
    Object.keys(sources).forEach(function (id) {                               // 41
      var source = sources[id];                                                // 42
      if (source) {                                                            // 43
        addSource(id, source);                                                 // 44
      } else {                                                                 // 45
        addMissing(id);                                                        // 46
      }                                                                        // 47
    });                                                                        // 48
                                                                               // 49
    return missing && fetchMissing(missing).then(function (results) {          // 50
      var versionsAndSourcesById = Object.create(null);                        // 51
      var flatResults = flattenModuleTree(results);                            // 52
                                                                               // 53
      Object.keys(flatResults).forEach(function (id) {                         // 54
        var source = flatResults[id];                                          // 55
        addSource(id, source);                                                 // 56
                                                                               // 57
        var version = dynamicVersions.get(id);                                 // 58
        if (version) {                                                         // 59
          versionsAndSourcesById[id] = {                                       // 60
            version: version,                                                  // 61
            source: source                                                     // 62
          };                                                                   // 63
        }                                                                      // 64
      });                                                                      // 65
                                                                               // 66
      cache.setMany(versionsAndSourcesById);                                   // 67
    });                                                                        // 68
                                                                               // 69
  }).then(function () {                                                        // 70
    return tree;                                                               // 71
  });                                                                          // 72
};                                                                             // 73
                                                                               // 74
function flattenModuleTree(tree) {                                             // 75
  var parts = [""];                                                            // 76
  var result = Object.create(null);                                            // 77
                                                                               // 78
  function walk(t) {                                                           // 79
    if (t && typeof t === "object") {                                          // 80
      Object.keys(t).forEach(function (key) {                                  // 81
        parts.push(key);                                                       // 82
        walk(t[key]);                                                          // 83
        parts.pop();                                                           // 84
      });                                                                      // 85
    } else if (typeof t === "string") {                                        // 86
      result[parts.join("/")] = t;                                             // 87
    }                                                                          // 88
  }                                                                            // 89
                                                                               // 90
  walk(tree);                                                                  // 91
                                                                               // 92
  return result;                                                               // 93
}                                                                              // 94
                                                                               // 95
function makeModuleFunction(id, source, options) {                             // 96
  // By calling (options && options.eval || eval) in a wrapper function,       // 97
  // we delay the cost of parsing and evaluating the module code until the     // 98
  // module is first imported.                                                 // 99
  return function () {                                                         // 100
    // If an options.eval function was provided in the second argument to      // 101
    // meteorInstall when this bundle was first installed, use that            // 102
    // function to parse and evaluate the dynamic module code in the scope     // 103
    // of the package. Otherwise fall back to indirect (global) eval.          // 104
    return (options && options.eval || eval)(                                  // 105
      // Wrap the function(require,exports,module){...} expression in          // 106
      // parentheses to force it to be parsed as an expression.                // 107
      "(" + source + ")\n//# sourceURL=" + id                                  // 108
    ).apply(this, arguments);                                                  // 109
  };                                                                           // 110
}                                                                              // 111
                                                                               // 112
function fetchMissing(missingTree) {                                           // 113
  // Update lastFetchMissingPromise immediately, without waiting for           // 114
  // the results to be delivered.                                              // 115
  return new Promise(function (resolve, reject) {                              // 116
    Meteor.call(                                                               // 117
      "__dynamicImport",                                                       // 118
      missingTree,                                                             // 119
      function (error, resultsTree) {                                          // 120
        error ? reject(error) : resolve(resultsTree);                          // 121
      }                                                                        // 122
    );                                                                         // 123
  });                                                                          // 124
}                                                                              // 125
                                                                               // 126
function addToTree(tree, id, value) {                                          // 127
  var parts = id.split("/");                                                   // 128
  var lastIndex = parts.length - 1;                                            // 129
  parts.forEach(function (part, i) {                                           // 130
    if (part) {                                                                // 131
      tree = tree[part] = tree[part] ||                                        // 132
        (i < lastIndex ? Object.create(null) : value);                         // 133
    }                                                                          // 134
  });                                                                          // 135
}                                                                              // 136
                                                                               // 137
function getNamespace(module, id) {                                            // 138
  var namespace;                                                               // 139
                                                                               // 140
  module.watch(module.require(id), {                                           // 141
    "*": function (ns) {                                                       // 142
      namespace = ns;                                                          // 143
    }                                                                          // 144
  });                                                                          // 145
                                                                               // 146
  // This helps with Babel interop, since we're not just returning the         // 147
  // module.exports object.                                                    // 148
  Object.defineProperty(namespace, "__esModule", {                             // 149
    value: true,                                                               // 150
    enumerable: false                                                          // 151
  });                                                                          // 152
                                                                               // 153
  return namespace;                                                            // 154
}                                                                              // 155
                                                                               // 156
/////////////////////////////////////////////////////////////////////////////////

},"cache.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/dynamic-import/cache.js                                            //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
var hasOwn = Object.prototype.hasOwnProperty;                                  // 1
var dbPromise;                                                                 // 2
                                                                               // 3
var canUseCache =                                                              // 4
  // The server doesn't benefit from dynamic module fetching, and almost       // 5
  // certainly doesn't support IndexedDB.                                      // 6
  Meteor.isClient &&                                                           // 7
  // Cordova bundles all modules into the monolithic initial bundle, so        // 8
  // the dynamic module cache won't be necessary.                              // 9
  ! Meteor.isCordova &&                                                        // 10
  // Caching can be confusing in development, and is designed to be a          // 11
  // transparent optimization for production performance.                      // 12
  Meteor.isProduction;                                                         // 13
                                                                               // 14
function getIDB() {                                                            // 15
  if (typeof indexedDB !== "undefined") return indexedDB;                      // 16
  if (typeof webkitIndexedDB !== "undefined") return webkitIndexedDB;          // 17
  if (typeof mozIndexedDB !== "undefined") return mozIndexedDB;                // 18
  if (typeof OIndexedDB !== "undefined") return OIndexedDB;                    // 19
  if (typeof msIndexedDB !== "undefined") return msIndexedDB;                  // 20
}                                                                              // 21
                                                                               // 22
function withDB(callback) {                                                    // 23
  dbPromise = dbPromise || new Promise(function (resolve, reject) {            // 24
    var idb = getIDB();                                                        // 25
    if (! idb) {                                                               // 26
      throw new Error("IndexedDB not available");                              // 27
    }                                                                          // 28
                                                                               // 29
    // Incrementing the version number causes all existing object stores       // 30
    // to be deleted and recreates those specified by objectStoreMap.          // 31
    var request = idb.open("MeteorDynamicImportCache", 2);                     // 32
                                                                               // 33
    request.onupgradeneeded = function (event) {                               // 34
      var db = event.target.result;                                            // 35
                                                                               // 36
      // It's fine to delete existing object stores since onupgradeneeded      // 37
      // is only called when we change the DB version number, and the data     // 38
      // we're storing is disposable/reconstructible.                          // 39
      Array.from(db.objectStoreNames).forEach(db.deleteObjectStore, db);       // 40
                                                                               // 41
      Object.keys(objectStoreMap).forEach(function (name) {                    // 42
        db.createObjectStore(name, objectStoreMap[name]);                      // 43
      });                                                                      // 44
    };                                                                         // 45
                                                                               // 46
    request.onerror = makeOnError(reject, "indexedDB.open");                   // 47
    request.onsuccess = function (event) {                                     // 48
      resolve(event.target.result);                                            // 49
    };                                                                         // 50
  });                                                                          // 51
                                                                               // 52
  return dbPromise.then(callback, function (error) {                           // 53
    return callback(null);                                                     // 54
  });                                                                          // 55
}                                                                              // 56
                                                                               // 57
var objectStoreMap = {                                                         // 58
  sourcesByVersion: { keyPath: "version" }                                     // 59
};                                                                             // 60
                                                                               // 61
function makeOnError(reject, source) {                                         // 62
  return function (event) {                                                    // 63
    reject(new Error(                                                          // 64
      "IndexedDB failure in " + source + " " +                                 // 65
        JSON.stringify(event.target)                                           // 66
    ));                                                                        // 67
                                                                               // 68
    // Returning true from an onerror callback function prevents an            // 69
    // InvalidStateError in Firefox during Private Browsing. Silencing         // 70
    // that error is safe because we handle the error more gracefully by       // 71
    // passing it to the Promise reject function above.                        // 72
    // https://github.com/meteor/meteor/issues/8697                            // 73
    return true;                                                               // 74
  };                                                                           // 75
}                                                                              // 76
                                                                               // 77
var checkCount = 0;                                                            // 78
                                                                               // 79
exports.checkMany = function (versions) {                                      // 80
  var ids = Object.keys(versions);                                             // 81
  var sourcesById = Object.create(null);                                       // 82
                                                                               // 83
  // Initialize sourcesById with null values to indicate all sources are       // 84
  // missing (unless replaced with actual sources below).                      // 85
  ids.forEach(function (id) {                                                  // 86
    sourcesById[id] = null;                                                    // 87
  });                                                                          // 88
                                                                               // 89
  if (! canUseCache) {                                                         // 90
    return Promise.resolve(sourcesById);                                       // 91
  }                                                                            // 92
                                                                               // 93
  return withDB(function (db) {                                                // 94
    if (! db) {                                                                // 95
      // We thought we could used IndexedDB, but something went wrong          // 96
      // while opening the database, so err on the side of safety.             // 97
      return sourcesById;                                                      // 98
    }                                                                          // 99
                                                                               // 100
    var txn = db.transaction([                                                 // 101
      "sourcesByVersion"                                                       // 102
    ], "readonly");                                                            // 103
                                                                               // 104
    var sourcesByVersion = txn.objectStore("sourcesByVersion");                // 105
                                                                               // 106
    ++checkCount;                                                              // 107
                                                                               // 108
    function finish() {                                                        // 109
      --checkCount;                                                            // 110
      return sourcesById;                                                      // 111
    }                                                                          // 112
                                                                               // 113
    return Promise.all(ids.map(function (id) {                                 // 114
      return new Promise(function (resolve, reject) {                          // 115
        var version = versions[id];                                            // 116
        if (version) {                                                         // 117
          var sourceRequest = sourcesByVersion.get(version);                   // 118
          sourceRequest.onerror = makeOnError(reject, "sourcesByVersion.get");
          sourceRequest.onsuccess = function (event) {                         // 120
            var result = event.target.result;                                  // 121
            if (result) {                                                      // 122
              sourcesById[id] = result.source;                                 // 123
            }                                                                  // 124
            resolve();                                                         // 125
          };                                                                   // 126
        } else resolve();                                                      // 127
      });                                                                      // 128
    })).then(finish, finish);                                                  // 129
  });                                                                          // 130
};                                                                             // 131
                                                                               // 132
var pendingVersionsAndSourcesById = Object.create(null);                       // 133
                                                                               // 134
exports.setMany = function (versionsAndSourcesById) {                          // 135
  if (canUseCache) {                                                           // 136
    Object.assign(                                                             // 137
      pendingVersionsAndSourcesById,                                           // 138
      versionsAndSourcesById                                                   // 139
    );                                                                         // 140
                                                                               // 141
    // Delay the call to flushSetMany so that it doesn't contribute to the     // 142
    // amount of time it takes to call module.dynamicImport.                   // 143
    if (! flushSetMany.timer) {                                                // 144
      flushSetMany.timer = setTimeout(flushSetMany, 100);                      // 145
    }                                                                          // 146
  }                                                                            // 147
};                                                                             // 148
                                                                               // 149
function flushSetMany() {                                                      // 150
  if (checkCount > 0) {                                                        // 151
    // If checkMany is currently underway, postpone the flush until later,     // 152
    // since updating the cache is less important than reading from it.        // 153
    return flushSetMany.timer = setTimeout(flushSetMany, 100);                 // 154
  }                                                                            // 155
                                                                               // 156
  flushSetMany.timer = null;                                                   // 157
                                                                               // 158
  var versionsAndSourcesById = pendingVersionsAndSourcesById;                  // 159
  pendingVersionsAndSourcesById = Object.create(null);                         // 160
                                                                               // 161
  return withDB(function (db) {                                                // 162
    if (! db) {                                                                // 163
      // We thought we could used IndexedDB, but something went wrong          // 164
      // while opening the database, so err on the side of safety.             // 165
      return;                                                                  // 166
    }                                                                          // 167
                                                                               // 168
    var setTxn = db.transaction([                                              // 169
      "sourcesByVersion"                                                       // 170
    ], "readwrite");                                                           // 171
                                                                               // 172
    var sourcesByVersion = setTxn.objectStore("sourcesByVersion");             // 173
                                                                               // 174
    return Promise.all(                                                        // 175
      Object.keys(versionsAndSourcesById).map(function (id) {                  // 176
        var info = versionsAndSourcesById[id];                                 // 177
        return new Promise(function (resolve, reject) {                        // 178
          var request = sourcesByVersion.put({                                 // 179
            version: info.version,                                             // 180
            source: info.source                                                // 181
          });                                                                  // 182
          request.onerror = makeOnError(reject, "sourcesByVersion.put");       // 183
          request.onsuccess = resolve;                                         // 184
        });                                                                    // 185
      })                                                                       // 186
    );                                                                         // 187
  });                                                                          // 188
}                                                                              // 189
                                                                               // 190
/////////////////////////////////////////////////////////////////////////////////

},"dynamic-versions.js":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/dynamic-import/dynamic-versions.js                                 //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
// This magic double-underscored identifier gets replaced in                   // 1
// tools/isobuild/bundler.js with a tree of hashes of all dynamic              // 2
// modules, for use in client.js and cache.js.                                 // 3
var versions = {};                                           // 4
                                                                               // 5
exports.get = function (id) {                                                  // 6
  var tree = versions;                                                         // 7
  var version = null;                                                          // 8
                                                                               // 9
  id.split("/").some(function (part) {                                         // 10
    if (part) {                                                                // 11
      // If the tree contains identifiers for Meteor packages with colons      // 12
      // in their names, the colons should not have been replaced by           // 13
      // underscores, but there's a bug that results in that behavior, so      // 14
      // for now it seems safest to be tolerant of underscores here.           // 15
      // https://github.com/meteor/meteor/pull/9103                            // 16
      tree = tree[part] || tree[part.replace(":", "_")];                       // 17
    }                                                                          // 18
                                                                               // 19
    if (! tree) {                                                              // 20
      // Terminate the search without reassigning version.                     // 21
      return true;                                                             // 22
    }                                                                          // 23
                                                                               // 24
    if (typeof tree === "string") {                                            // 25
      version = tree;                                                          // 26
      return true;                                                             // 27
    }                                                                          // 28
  });                                                                          // 29
                                                                               // 30
  return version;                                                              // 31
};                                                                             // 32
                                                                               // 33
/////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/dynamic-import/client.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['dynamic-import'] = exports;

})();
