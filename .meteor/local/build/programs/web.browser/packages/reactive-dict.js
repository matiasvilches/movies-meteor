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
var _ = Package.underscore._;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var EJSON = Package.ejson.EJSON;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var Symbol = Package['ecmascript-runtime-client'].Symbol;
var Map = Package['ecmascript-runtime-client'].Map;
var Set = Package['ecmascript-runtime-client'].Set;

/* Package-scope variables */
var ReactiveDict;

var require = meteorInstall({"node_modules":{"meteor":{"reactive-dict":{"migration.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/reactive-dict/migration.js                                                                             //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.export({                                                                                                    // 1
  ReactiveDict: function () {                                                                                      // 1
    return ReactiveDict;                                                                                           // 1
  }                                                                                                                // 1
});                                                                                                                // 1
var ReactiveDict = void 0;                                                                                         // 1
module.watch(require("./reactive-dict"), {                                                                         // 1
  ReactiveDict: function (v) {                                                                                     // 1
    ReactiveDict = v;                                                                                              // 1
  }                                                                                                                // 1
}, 0);                                                                                                             // 1
ReactiveDict._migratedDictData = {}; // name -> data                                                               // 3
                                                                                                                   //
ReactiveDict._dictsToMigrate = {}; // name -> ReactiveDict                                                         // 4
                                                                                                                   //
ReactiveDict._loadMigratedDict = function (dictName) {                                                             // 6
  if (_.has(ReactiveDict._migratedDictData, dictName)) {                                                           // 7
    var data = ReactiveDict._migratedDictData[dictName];                                                           // 8
    delete ReactiveDict._migratedDictData[dictName];                                                               // 9
    return data;                                                                                                   // 10
  }                                                                                                                // 11
                                                                                                                   //
  return null;                                                                                                     // 13
};                                                                                                                 // 14
                                                                                                                   //
ReactiveDict._registerDictForMigrate = function (dictName, dict) {                                                 // 16
  if (_.has(ReactiveDict._dictsToMigrate, dictName)) throw new Error("Duplicate ReactiveDict name: " + dictName);  // 17
  ReactiveDict._dictsToMigrate[dictName] = dict;                                                                   // 20
};                                                                                                                 // 21
                                                                                                                   //
if (Meteor.isClient && Package.reload) {                                                                           // 23
  // Put old migrated data into ReactiveDict._migratedDictData,                                                    // 24
  // where it can be accessed by ReactiveDict._loadMigratedDict.                                                   // 25
  var migrationData = Package.reload.Reload._migrationData('reactive-dict');                                       // 26
                                                                                                                   //
  if (migrationData && migrationData.dicts) ReactiveDict._migratedDictData = migrationData.dicts; // On migration, assemble the data from all the dicts that have been
  // registered.                                                                                                   // 31
                                                                                                                   //
  Package.reload.Reload._onMigrate('reactive-dict', function () {                                                  // 32
    var dictsToMigrate = ReactiveDict._dictsToMigrate;                                                             // 33
    var dataToMigrate = {};                                                                                        // 34
                                                                                                                   //
    for (var dictName in meteorBabelHelpers.sanitizeForInObject(dictsToMigrate)) {                                 // 36
      dataToMigrate[dictName] = dictsToMigrate[dictName]._getMigrationData();                                      // 37
    }                                                                                                              // 36
                                                                                                                   //
    return [true, {                                                                                                // 39
      dicts: dataToMigrate                                                                                         // 39
    }];                                                                                                            // 39
  });                                                                                                              // 40
}                                                                                                                  // 41
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"reactive-dict.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/reactive-dict/reactive-dict.js                                                                         //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                            //
                                                                                                                   //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                   //
                                                                                                                   //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                            //
                                                                                                                   //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                   //
                                                                                                                   //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                  //
                                                                                                                   //
module.export({                                                                                                    // 1
  ReactiveDict: function () {                                                                                      // 1
    return ReactiveDict;                                                                                           // 1
  }                                                                                                                // 1
});                                                                                                                // 1
                                                                                                                   //
// XXX come up with a serialization method which canonicalizes object key                                          // 1
// order, which would allow us to use objects as values for equals.                                                // 2
function stringify(value) {                                                                                        // 3
  if (value === undefined) {                                                                                       // 4
    return 'undefined';                                                                                            // 5
  }                                                                                                                // 6
                                                                                                                   //
  return EJSON.stringify(value);                                                                                   // 7
}                                                                                                                  // 8
                                                                                                                   //
function parse(serialized) {                                                                                       // 10
  if (serialized === undefined || serialized === 'undefined') {                                                    // 11
    return undefined;                                                                                              // 12
  }                                                                                                                // 13
                                                                                                                   //
  return EJSON.parse(serialized);                                                                                  // 14
}                                                                                                                  // 15
                                                                                                                   //
function changed(v) {                                                                                              // 17
  v && v.changed();                                                                                                // 18
} // XXX COMPAT WITH 0.9.1 : accept migrationData instead of dictName                                              // 19
                                                                                                                   //
                                                                                                                   //
var ReactiveDict = function () {                                                                                   //
  function ReactiveDict(dictName, dictData) {                                                                      // 23
    (0, _classCallCheck3.default)(this, ReactiveDict);                                                             // 23
    // this.keys: key -> value                                                                                     // 24
    this.keys = {};                                                                                                // 25
                                                                                                                   //
    if (dictName) {                                                                                                // 27
      // name given; migration will be performed                                                                   // 28
      if (typeof dictName === 'string') {                                                                          // 29
        // the normal case, argument is a string name.                                                             // 30
        // Only run migration logic on client, it will cause                                                       // 32
        // duplicate name errors on server during reloads.                                                         // 33
        // _registerDictForMigrate will throw an error on duplicate name.                                          // 34
        Meteor.isClient && ReactiveDict._registerDictForMigrate(dictName, this);                                   // 35
                                                                                                                   //
        var migratedData = Meteor.isClient && ReactiveDict._loadMigratedDict(dictName);                            // 36
                                                                                                                   //
        if (migratedData) {                                                                                        // 38
          // Don't stringify migrated data                                                                         // 39
          this.keys = migratedData;                                                                                // 40
        } else {                                                                                                   // 41
          // Use _setObject to make sure values are stringified                                                    // 42
          this._setObject(dictData || {});                                                                         // 43
        }                                                                                                          // 44
                                                                                                                   //
        this.name = dictName;                                                                                      // 45
      } else if ((typeof dictName === "undefined" ? "undefined" : (0, _typeof3.default)(dictName)) === 'object') {
        // back-compat case: dictName is actually migrationData                                                    // 47
        // Use _setObject to make sure values are stringified                                                      // 48
        this._setObject(dictName);                                                                                 // 49
      } else {                                                                                                     // 50
        throw new Error("Invalid ReactiveDict argument: " + dictName);                                             // 51
      }                                                                                                            // 52
    } else if ((typeof dictData === "undefined" ? "undefined" : (0, _typeof3.default)(dictData)) === 'object') {   // 53
      this._setObject(dictData);                                                                                   // 54
    }                                                                                                              // 55
                                                                                                                   //
    this.allDeps = new Tracker.Dependency();                                                                       // 57
    this.keyDeps = {}; // key -> Dependency                                                                        // 58
                                                                                                                   //
    this.keyValueDeps = {}; // key -> Dependency                                                                   // 59
  } // set() began as a key/value method, but we are now overloading it                                            // 60
  // to take an object of key/value pairs, similar to backbone                                                     // 63
  // http://backbonejs.org/#Model-set                                                                              // 64
                                                                                                                   //
                                                                                                                   //
  ReactiveDict.prototype.set = function () {                                                                       //
    function set(keyOrObject, value) {                                                                             //
      if ((typeof keyOrObject === "undefined" ? "undefined" : (0, _typeof3.default)(keyOrObject)) === 'object' && value === undefined) {
        // Called as `dict.set({...})`                                                                             // 67
        this._setObject(keyOrObject);                                                                              // 68
                                                                                                                   //
        return;                                                                                                    // 69
      } // the input isn't an object, so it must be a key                                                          // 70
      // and we resume with the rest of the function                                                               // 72
                                                                                                                   //
                                                                                                                   //
      var key = keyOrObject;                                                                                       // 73
      value = stringify(value);                                                                                    // 75
                                                                                                                   //
      var keyExisted = _.has(this.keys, key);                                                                      // 77
                                                                                                                   //
      var oldSerializedValue = keyExisted ? this.keys[key] : 'undefined';                                          // 78
      var isNewValue = value !== oldSerializedValue;                                                               // 79
      this.keys[key] = value;                                                                                      // 81
                                                                                                                   //
      if (isNewValue || !keyExisted) {                                                                             // 83
        // Using the changed utility function here because this.allDeps might not exist yet,                       // 84
        // when setting initial data from constructor                                                              // 85
        changed(this.allDeps);                                                                                     // 86
      } // Don't trigger changes when setting initial data from constructor,                                       // 87
      // this.KeyDeps is undefined in this case                                                                    // 90
                                                                                                                   //
                                                                                                                   //
      if (isNewValue && this.keyDeps) {                                                                            // 91
        changed(this.keyDeps[key]);                                                                                // 92
                                                                                                                   //
        if (this.keyValueDeps[key]) {                                                                              // 93
          changed(this.keyValueDeps[key][oldSerializedValue]);                                                     // 94
          changed(this.keyValueDeps[key][value]);                                                                  // 95
        }                                                                                                          // 96
      }                                                                                                            // 97
    }                                                                                                              // 98
                                                                                                                   //
    return set;                                                                                                    //
  }();                                                                                                             //
                                                                                                                   //
  ReactiveDict.prototype.setDefault = function () {                                                                //
    function setDefault(keyOrObject, value) {                                                                      //
      if ((typeof keyOrObject === "undefined" ? "undefined" : (0, _typeof3.default)(keyOrObject)) === 'object' && value === undefined) {
        // Called as `dict.setDefault({...})`                                                                      // 102
        this._setDefaultObject(keyOrObject);                                                                       // 103
                                                                                                                   //
        return;                                                                                                    // 104
      } // the input isn't an object, so it must be a key                                                          // 105
      // and we resume with the rest of the function                                                               // 107
                                                                                                                   //
                                                                                                                   //
      var key = keyOrObject;                                                                                       // 108
                                                                                                                   //
      if (!_.has(this.keys, key)) {                                                                                // 110
        this.set(key, value);                                                                                      // 111
      }                                                                                                            // 112
    }                                                                                                              // 113
                                                                                                                   //
    return setDefault;                                                                                             //
  }();                                                                                                             //
                                                                                                                   //
  ReactiveDict.prototype.get = function () {                                                                       //
    function get(key) {                                                                                            //
      this._ensureKey(key);                                                                                        // 116
                                                                                                                   //
      this.keyDeps[key].depend();                                                                                  // 117
      return parse(this.keys[key]);                                                                                // 118
    }                                                                                                              // 119
                                                                                                                   //
    return get;                                                                                                    //
  }();                                                                                                             //
                                                                                                                   //
  ReactiveDict.prototype.equals = function () {                                                                    //
    function equals(key, value) {                                                                                  //
      var _this = this;                                                                                            // 121
                                                                                                                   //
      // Mongo.ObjectID is in the 'mongo' package                                                                  // 122
      var ObjectID = null;                                                                                         // 123
                                                                                                                   //
      if (Package.mongo) {                                                                                         // 124
        ObjectID = Package.mongo.Mongo.ObjectID;                                                                   // 125
      } // We don't allow objects (or arrays that might include objects) for                                       // 126
      // .equals, because JSON.stringify doesn't canonicalize object key                                           // 128
      // order. (We can make equals have the right return value by parsing the                                     // 129
      // current value and using EJSON.equals, but we won't have a canonical                                       // 130
      // element of keyValueDeps[key] to store the dependency.) You can still use                                  // 131
      // "EJSON.equals(reactiveDict.get(key), value)".                                                             // 132
      //                                                                                                           // 133
      // XXX we could allow arrays as long as we recursively check that there                                      // 134
      // are no objects                                                                                            // 135
                                                                                                                   //
                                                                                                                   //
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' && typeof value !== 'undefined' && !(value instanceof Date) && !(ObjectID && value instanceof ObjectID) && value !== null) {
        throw new Error("ReactiveDict.equals: value must be scalar");                                              // 143
      }                                                                                                            // 144
                                                                                                                   //
      var serializedValue = stringify(value);                                                                      // 145
                                                                                                                   //
      if (Tracker.active) {                                                                                        // 147
        this._ensureKey(key);                                                                                      // 148
                                                                                                                   //
        if (!_.has(this.keyValueDeps[key], serializedValue)) {                                                     // 150
          this.keyValueDeps[key][serializedValue] = new Tracker.Dependency();                                      // 151
        }                                                                                                          // 152
                                                                                                                   //
        var isNew = this.keyValueDeps[key][serializedValue].depend();                                              // 154
                                                                                                                   //
        if (isNew) {                                                                                               // 155
          Tracker.onInvalidate(function () {                                                                       // 156
            // clean up [key][serializedValue] if it's now empty, so we don't                                      // 157
            // use O(n) memory for n = values seen ever                                                            // 158
            if (!_this.keyValueDeps[key][serializedValue].hasDependents()) {                                       // 159
              delete _this.keyValueDeps[key][serializedValue];                                                     // 160
            }                                                                                                      // 161
          });                                                                                                      // 162
        }                                                                                                          // 163
      }                                                                                                            // 164
                                                                                                                   //
      var oldValue = undefined;                                                                                    // 166
                                                                                                                   //
      if (_.has(this.keys, key)) {                                                                                 // 167
        oldValue = parse(this.keys[key]);                                                                          // 168
      }                                                                                                            // 169
                                                                                                                   //
      return EJSON.equals(oldValue, value);                                                                        // 170
    }                                                                                                              // 171
                                                                                                                   //
    return equals;                                                                                                 //
  }();                                                                                                             //
                                                                                                                   //
  ReactiveDict.prototype.all = function () {                                                                       //
    function all() {                                                                                               //
      this.allDeps.depend();                                                                                       // 174
      var ret = {};                                                                                                // 175
                                                                                                                   //
      _.each(this.keys, function (value, key) {                                                                    // 176
        ret[key] = parse(value);                                                                                   // 177
      });                                                                                                          // 178
                                                                                                                   //
      return ret;                                                                                                  // 179
    }                                                                                                              // 180
                                                                                                                   //
    return all;                                                                                                    //
  }();                                                                                                             //
                                                                                                                   //
  ReactiveDict.prototype.clear = function () {                                                                     //
    function clear() {                                                                                             //
      var _this2 = this;                                                                                           // 182
                                                                                                                   //
      var oldKeys = this.keys;                                                                                     // 183
      this.keys = {};                                                                                              // 184
      this.allDeps.changed();                                                                                      // 186
                                                                                                                   //
      _.each(oldKeys, function (value, key) {                                                                      // 188
        changed(_this2.keyDeps[key]);                                                                              // 189
                                                                                                                   //
        if (_this2.keyValueDeps[key]) {                                                                            // 190
          changed(_this2.keyValueDeps[key][value]);                                                                // 191
          changed(_this2.keyValueDeps[key]['undefined']);                                                          // 192
        }                                                                                                          // 193
      });                                                                                                          // 194
    }                                                                                                              // 195
                                                                                                                   //
    return clear;                                                                                                  //
  }();                                                                                                             //
                                                                                                                   //
  ReactiveDict.prototype.delete = function () {                                                                    //
    function _delete(key) {                                                                                        //
      var didRemove = false;                                                                                       // 198
                                                                                                                   //
      if (_.has(this.keys, key)) {                                                                                 // 200
        var oldValue = this.keys[key];                                                                             // 201
        delete this.keys[key];                                                                                     // 202
        changed(this.keyDeps[key]);                                                                                // 203
                                                                                                                   //
        if (this.keyValueDeps[key]) {                                                                              // 204
          changed(this.keyValueDeps[key][oldValue]);                                                               // 205
          changed(this.keyValueDeps[key]['undefined']);                                                            // 206
        }                                                                                                          // 207
                                                                                                                   //
        this.allDeps.changed();                                                                                    // 208
        didRemove = true;                                                                                          // 209
      }                                                                                                            // 210
                                                                                                                   //
      return didRemove;                                                                                            // 211
    }                                                                                                              // 212
                                                                                                                   //
    return _delete;                                                                                                //
  }();                                                                                                             //
                                                                                                                   //
  ReactiveDict.prototype.destroy = function () {                                                                   //
    function destroy() {                                                                                           //
      this.clear();                                                                                                // 215
                                                                                                                   //
      if (this.name && _.has(ReactiveDict._dictsToMigrate, this.name)) {                                           // 216
        delete ReactiveDict._dictsToMigrate[this.name];                                                            // 217
      }                                                                                                            // 218
    }                                                                                                              // 219
                                                                                                                   //
    return destroy;                                                                                                //
  }();                                                                                                             //
                                                                                                                   //
  ReactiveDict.prototype._setObject = function () {                                                                //
    function _setObject(object) {                                                                                  //
      var _this3 = this;                                                                                           // 221
                                                                                                                   //
      _.each(object, function (value, key) {                                                                       // 222
        _this3.set(key, value);                                                                                    // 223
      });                                                                                                          // 224
    }                                                                                                              // 225
                                                                                                                   //
    return _setObject;                                                                                             //
  }();                                                                                                             //
                                                                                                                   //
  ReactiveDict.prototype._setDefaultObject = function () {                                                         //
    function _setDefaultObject(object) {                                                                           //
      var _this4 = this;                                                                                           // 227
                                                                                                                   //
      _.each(object, function (value, key) {                                                                       // 228
        _this4.setDefault(key, value);                                                                             // 229
      });                                                                                                          // 230
    }                                                                                                              // 231
                                                                                                                   //
    return _setDefaultObject;                                                                                      //
  }();                                                                                                             //
                                                                                                                   //
  ReactiveDict.prototype._ensureKey = function () {                                                                //
    function _ensureKey(key) {                                                                                     //
      if (!(key in this.keyDeps)) {                                                                                // 234
        this.keyDeps[key] = new Tracker.Dependency();                                                              // 235
        this.keyValueDeps[key] = {};                                                                               // 236
      }                                                                                                            // 237
    }                                                                                                              // 238
                                                                                                                   //
    return _ensureKey;                                                                                             //
  }(); // Get a JSON value that can be passed to the constructor to                                                //
  // create a new ReactiveDict with the same contents as this one                                                  // 241
                                                                                                                   //
                                                                                                                   //
  ReactiveDict.prototype._getMigrationData = function () {                                                         //
    function _getMigrationData() {                                                                                 //
      // XXX sanitize and make sure it's JSONible?                                                                 // 243
      return this.keys;                                                                                            // 244
    }                                                                                                              // 245
                                                                                                                   //
    return _getMigrationData;                                                                                      //
  }();                                                                                                             //
                                                                                                                   //
  return ReactiveDict;                                                                                             //
}();                                                                                                               //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/reactive-dict/migration.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['reactive-dict'] = exports, {
  ReactiveDict: ReactiveDict
});

})();
