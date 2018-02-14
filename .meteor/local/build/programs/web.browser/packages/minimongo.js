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
var DiffSequence = Package['diff-sequence'].DiffSequence;
var EJSON = Package.ejson.EJSON;
var GeoJSON = Package['geojson-utils'].GeoJSON;
var IdMap = Package['id-map'].IdMap;
var MongoID = Package['mongo-id'].MongoID;
var OrderedDict = Package['ordered-dict'].OrderedDict;
var Random = Package.random.Random;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var Symbol = Package['ecmascript-runtime-client'].Symbol;
var Map = Package['ecmascript-runtime-client'].Map;
var Set = Package['ecmascript-runtime-client'].Set;

/* Package-scope variables */
var MinimongoTest, MinimongoError, LocalCollection, Minimongo;

var require = meteorInstall({"node_modules":{"meteor":{"minimongo":{"minimongo_client.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_client.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./minimongo_common.js"));                                                                        // 1
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"common.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/common.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _toConsumableArray2 = require("babel-runtime/helpers/toConsumableArray");                                          //
                                                                                                                       //
var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);                                                 //
                                                                                                                       //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                                //
                                                                                                                       //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  hasOwn: function () {                                                                                                // 1
    return hasOwn;                                                                                                     // 1
  },                                                                                                                   // 1
  ELEMENT_OPERATORS: function () {                                                                                     // 1
    return ELEMENT_OPERATORS;                                                                                          // 1
  },                                                                                                                   // 1
  compileDocumentSelector: function () {                                                                               // 1
    return compileDocumentSelector;                                                                                    // 1
  },                                                                                                                   // 1
  equalityElementMatcher: function () {                                                                                // 1
    return equalityElementMatcher;                                                                                     // 1
  },                                                                                                                   // 1
  expandArraysInBranches: function () {                                                                                // 1
    return expandArraysInBranches;                                                                                     // 1
  },                                                                                                                   // 1
  isIndexable: function () {                                                                                           // 1
    return isIndexable;                                                                                                // 1
  },                                                                                                                   // 1
  isNumericKey: function () {                                                                                          // 1
    return isNumericKey;                                                                                               // 1
  },                                                                                                                   // 1
  isOperatorObject: function () {                                                                                      // 1
    return isOperatorObject;                                                                                           // 1
  },                                                                                                                   // 1
  makeLookupFunction: function () {                                                                                    // 1
    return makeLookupFunction;                                                                                         // 1
  },                                                                                                                   // 1
  nothingMatcher: function () {                                                                                        // 1
    return nothingMatcher;                                                                                             // 1
  },                                                                                                                   // 1
  pathsToTree: function () {                                                                                           // 1
    return pathsToTree;                                                                                                // 1
  },                                                                                                                   // 1
  populateDocumentWithQueryFields: function () {                                                                       // 1
    return populateDocumentWithQueryFields;                                                                            // 1
  },                                                                                                                   // 1
  projectionDetails: function () {                                                                                     // 1
    return projectionDetails;                                                                                          // 1
  },                                                                                                                   // 1
  regexpElementMatcher: function () {                                                                                  // 1
    return regexpElementMatcher;                                                                                       // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
var LocalCollection = void 0;                                                                                          // 1
module.watch(require("./local_collection.js"), {                                                                       // 1
  "default": function (v) {                                                                                            // 1
    LocalCollection = v;                                                                                               // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var hasOwn = Object.prototype.hasOwnProperty;                                                                          // 3
var ELEMENT_OPERATORS = {                                                                                              // 17
  $lt: makeInequality(function (cmpValue) {                                                                            // 18
    return cmpValue < 0;                                                                                               // 18
  }),                                                                                                                  // 18
  $gt: makeInequality(function (cmpValue) {                                                                            // 19
    return cmpValue > 0;                                                                                               // 19
  }),                                                                                                                  // 19
  $lte: makeInequality(function (cmpValue) {                                                                           // 20
    return cmpValue <= 0;                                                                                              // 20
  }),                                                                                                                  // 20
  $gte: makeInequality(function (cmpValue) {                                                                           // 21
    return cmpValue >= 0;                                                                                              // 21
  }),                                                                                                                  // 21
  $mod: {                                                                                                              // 22
    compileElementSelector: function (operand) {                                                                       // 23
      if (!(Array.isArray(operand) && operand.length === 2 && typeof operand[0] === 'number' && typeof operand[1] === 'number')) {
        throw Error('argument to $mod must be an array of two numbers');                                               // 27
      } // XXX could require to be ints or round or something                                                          // 28
                                                                                                                       //
                                                                                                                       //
      var divisor = operand[0];                                                                                        // 31
      var remainder = operand[1];                                                                                      // 32
      return function (value) {                                                                                        // 33
        return typeof value === 'number' && value % divisor === remainder;                                             // 33
      };                                                                                                               // 33
    }                                                                                                                  // 36
  },                                                                                                                   // 22
  $in: {                                                                                                               // 38
    compileElementSelector: function (operand) {                                                                       // 39
      if (!Array.isArray(operand)) {                                                                                   // 40
        throw Error('$in needs an array');                                                                             // 41
      }                                                                                                                // 42
                                                                                                                       //
      var elementMatchers = operand.map(function (option) {                                                            // 44
        if (option instanceof RegExp) {                                                                                // 45
          return regexpElementMatcher(option);                                                                         // 46
        }                                                                                                              // 47
                                                                                                                       //
        if (isOperatorObject(option)) {                                                                                // 49
          throw Error('cannot nest $ under $in');                                                                      // 50
        }                                                                                                              // 51
                                                                                                                       //
        return equalityElementMatcher(option);                                                                         // 53
      });                                                                                                              // 54
      return function (value) {                                                                                        // 56
        // Allow {a: {$in: [null]}} to match when 'a' does not exist.                                                  // 57
        if (value === undefined) {                                                                                     // 58
          value = null;                                                                                                // 59
        }                                                                                                              // 60
                                                                                                                       //
        return elementMatchers.some(function (matcher) {                                                               // 62
          return matcher(value);                                                                                       // 62
        });                                                                                                            // 62
      };                                                                                                               // 63
    }                                                                                                                  // 64
  },                                                                                                                   // 38
  $size: {                                                                                                             // 66
    // {a: [[5, 5]]} must match {a: {$size: 1}} but not {a: {$size: 2}}, so we                                         // 67
    // don't want to consider the element [5,5] in the leaf array [[5,5]] as a                                         // 68
    // possible value.                                                                                                 // 69
    dontExpandLeafArrays: true,                                                                                        // 70
    compileElementSelector: function (operand) {                                                                       // 71
      if (typeof operand === 'string') {                                                                               // 72
        // Don't ask me why, but by experimentation, this seems to be what Mongo                                       // 73
        // does.                                                                                                       // 74
        operand = 0;                                                                                                   // 75
      } else if (typeof operand !== 'number') {                                                                        // 76
        throw Error('$size needs a number');                                                                           // 77
      }                                                                                                                // 78
                                                                                                                       //
      return function (value) {                                                                                        // 80
        return Array.isArray(value) && value.length === operand;                                                       // 80
      };                                                                                                               // 80
    }                                                                                                                  // 81
  },                                                                                                                   // 66
  $type: {                                                                                                             // 83
    // {a: [5]} must not match {a: {$type: 4}} (4 means array), but it should                                          // 84
    // match {a: {$type: 1}} (1 means number), and {a: [[5]]} must match {$a:                                          // 85
    // {$type: 4}}. Thus, when we see a leaf array, we *should* expand it but                                          // 86
    // should *not* include it itself.                                                                                 // 87
    dontIncludeLeafArrays: true,                                                                                       // 88
    compileElementSelector: function (operand) {                                                                       // 89
      if (typeof operand === 'string') {                                                                               // 90
        var operandAliasMap = {                                                                                        // 91
          'double': 1,                                                                                                 // 92
          'string': 2,                                                                                                 // 93
          'object': 3,                                                                                                 // 94
          'array': 4,                                                                                                  // 95
          'binData': 5,                                                                                                // 96
          'undefined': 6,                                                                                              // 97
          'objectId': 7,                                                                                               // 98
          'bool': 8,                                                                                                   // 99
          'date': 9,                                                                                                   // 100
          'null': 10,                                                                                                  // 101
          'regex': 11,                                                                                                 // 102
          'dbPointer': 12,                                                                                             // 103
          'javascript': 13,                                                                                            // 104
          'symbol': 14,                                                                                                // 105
          'javascriptWithScope': 15,                                                                                   // 106
          'int': 16,                                                                                                   // 107
          'timestamp': 17,                                                                                             // 108
          'long': 18,                                                                                                  // 109
          'decimal': 19,                                                                                               // 110
          'minKey': -1,                                                                                                // 111
          'maxKey': 127                                                                                                // 112
        };                                                                                                             // 91
                                                                                                                       //
        if (!hasOwn.call(operandAliasMap, operand)) {                                                                  // 114
          throw Error("unknown string alias for $type: " + operand);                                                   // 115
        }                                                                                                              // 116
                                                                                                                       //
        operand = operandAliasMap[operand];                                                                            // 117
      } else if (typeof operand === 'number') {                                                                        // 118
        if (operand === 0 || operand < -1 || operand > 19 && operand !== 127) {                                        // 119
          throw Error("Invalid numerical $type code: " + operand);                                                     // 121
        }                                                                                                              // 122
      } else {                                                                                                         // 123
        throw Error('argument to $type is not a number or a string');                                                  // 124
      }                                                                                                                // 125
                                                                                                                       //
      return function (value) {                                                                                        // 127
        return value !== undefined && LocalCollection._f._type(value) === operand;                                     // 127
      };                                                                                                               // 127
    }                                                                                                                  // 130
  },                                                                                                                   // 83
  $bitsAllSet: {                                                                                                       // 132
    compileElementSelector: function (operand) {                                                                       // 133
      var mask = getOperandBitmask(operand, '$bitsAllSet');                                                            // 134
      return function (value) {                                                                                        // 135
        var bitmask = getValueBitmask(value, mask.length);                                                             // 136
        return bitmask && mask.every(function (byte, i) {                                                              // 137
          return (bitmask[i] & byte) === byte;                                                                         // 137
        });                                                                                                            // 137
      };                                                                                                               // 138
    }                                                                                                                  // 139
  },                                                                                                                   // 132
  $bitsAnySet: {                                                                                                       // 141
    compileElementSelector: function (operand) {                                                                       // 142
      var mask = getOperandBitmask(operand, '$bitsAnySet');                                                            // 143
      return function (value) {                                                                                        // 144
        var bitmask = getValueBitmask(value, mask.length);                                                             // 145
        return bitmask && mask.some(function (byte, i) {                                                               // 146
          return (~bitmask[i] & byte) !== byte;                                                                        // 146
        });                                                                                                            // 146
      };                                                                                                               // 147
    }                                                                                                                  // 148
  },                                                                                                                   // 141
  $bitsAllClear: {                                                                                                     // 150
    compileElementSelector: function (operand) {                                                                       // 151
      var mask = getOperandBitmask(operand, '$bitsAllClear');                                                          // 152
      return function (value) {                                                                                        // 153
        var bitmask = getValueBitmask(value, mask.length);                                                             // 154
        return bitmask && mask.every(function (byte, i) {                                                              // 155
          return !(bitmask[i] & byte);                                                                                 // 155
        });                                                                                                            // 155
      };                                                                                                               // 156
    }                                                                                                                  // 157
  },                                                                                                                   // 150
  $bitsAnyClear: {                                                                                                     // 159
    compileElementSelector: function (operand) {                                                                       // 160
      var mask = getOperandBitmask(operand, '$bitsAnyClear');                                                          // 161
      return function (value) {                                                                                        // 162
        var bitmask = getValueBitmask(value, mask.length);                                                             // 163
        return bitmask && mask.some(function (byte, i) {                                                               // 164
          return (bitmask[i] & byte) !== byte;                                                                         // 164
        });                                                                                                            // 164
      };                                                                                                               // 165
    }                                                                                                                  // 166
  },                                                                                                                   // 159
  $regex: {                                                                                                            // 168
    compileElementSelector: function (operand, valueSelector) {                                                        // 169
      if (!(typeof operand === 'string' || operand instanceof RegExp)) {                                               // 170
        throw Error('$regex has to be a string or RegExp');                                                            // 171
      }                                                                                                                // 172
                                                                                                                       //
      var regexp = void 0;                                                                                             // 174
                                                                                                                       //
      if (valueSelector.$options !== undefined) {                                                                      // 175
        // Options passed in $options (even the empty string) always overrides                                         // 176
        // options in the RegExp object itself.                                                                        // 177
        // Be clear that we only support the JS-supported options, not extended                                        // 179
        // ones (eg, Mongo supports x and s). Ideally we would implement x and s                                       // 180
        // by transforming the regexp, but not today...                                                                // 181
        if (/[^gim]/.test(valueSelector.$options)) {                                                                   // 182
          throw new Error('Only the i, m, and g regexp options are supported');                                        // 183
        }                                                                                                              // 184
                                                                                                                       //
        var source = operand instanceof RegExp ? operand.source : operand;                                             // 186
        regexp = new RegExp(source, valueSelector.$options);                                                           // 187
      } else if (operand instanceof RegExp) {                                                                          // 188
        regexp = operand;                                                                                              // 189
      } else {                                                                                                         // 190
        regexp = new RegExp(operand);                                                                                  // 191
      }                                                                                                                // 192
                                                                                                                       //
      return regexpElementMatcher(regexp);                                                                             // 194
    }                                                                                                                  // 195
  },                                                                                                                   // 168
  $elemMatch: {                                                                                                        // 197
    dontExpandLeafArrays: true,                                                                                        // 198
    compileElementSelector: function (operand, valueSelector, matcher) {                                               // 199
      if (!LocalCollection._isPlainObject(operand)) {                                                                  // 200
        throw Error('$elemMatch need an object');                                                                      // 201
      }                                                                                                                // 202
                                                                                                                       //
      var isDocMatcher = !isOperatorObject(Object.keys(operand).filter(function (key) {                                // 204
        return !hasOwn.call(LOGICAL_OPERATORS, key);                                                                   // 206
      }).reduce(function (a, b) {                                                                                      // 206
        var _Object$assign;                                                                                            // 207
                                                                                                                       //
        return Object.assign(a, (_Object$assign = {}, _Object$assign[b] = operand[b], _Object$assign));                // 207
      }, {}), true);                                                                                                   // 207
      var subMatcher = void 0;                                                                                         // 210
                                                                                                                       //
      if (isDocMatcher) {                                                                                              // 211
        // This is NOT the same as compileValueSelector(operand), and not just                                         // 212
        // because of the slightly different calling convention.                                                       // 213
        // {$elemMatch: {x: 3}} means "an element has a field x:3", not                                                // 214
        // "consists only of a field x:3". Also, regexps and sub-$ are allowed.                                        // 215
        subMatcher = compileDocumentSelector(operand, matcher, {                                                       // 216
          inElemMatch: true                                                                                            // 217
        });                                                                                                            // 217
      } else {                                                                                                         // 218
        subMatcher = compileValueSelector(operand, matcher);                                                           // 219
      }                                                                                                                // 220
                                                                                                                       //
      return function (value) {                                                                                        // 222
        if (!Array.isArray(value)) {                                                                                   // 223
          return false;                                                                                                // 224
        }                                                                                                              // 225
                                                                                                                       //
        for (var i = 0; i < value.length; ++i) {                                                                       // 227
          var arrayElement = value[i];                                                                                 // 228
          var arg = void 0;                                                                                            // 229
                                                                                                                       //
          if (isDocMatcher) {                                                                                          // 230
            // We can only match {$elemMatch: {b: 3}} against objects.                                                 // 231
            // (We can also match against arrays, if there's numeric indices,                                          // 232
            // eg {$elemMatch: {'0.b': 3}} or {$elemMatch: {0: 3}}.)                                                   // 233
            if (!isIndexable(arrayElement)) {                                                                          // 234
              return false;                                                                                            // 235
            }                                                                                                          // 236
                                                                                                                       //
            arg = arrayElement;                                                                                        // 238
          } else {                                                                                                     // 239
            // dontIterate ensures that {a: {$elemMatch: {$gt: 5}}} matches                                            // 240
            // {a: [8]} but not {a: [[8]]}                                                                             // 241
            arg = [{                                                                                                   // 242
              value: arrayElement,                                                                                     // 242
              dontIterate: true                                                                                        // 242
            }];                                                                                                        // 242
          } // XXX support $near in $elemMatch by propagating $distance?                                               // 243
                                                                                                                       //
                                                                                                                       //
          if (subMatcher(arg).result) {                                                                                // 245
            return i; // specially understood to mean "use as arrayIndices"                                            // 246
          }                                                                                                            // 247
        }                                                                                                              // 248
                                                                                                                       //
        return false;                                                                                                  // 250
      };                                                                                                               // 251
    }                                                                                                                  // 252
  }                                                                                                                    // 197
};                                                                                                                     // 17
// Operators that appear at the top level of a document selector.                                                      // 256
var LOGICAL_OPERATORS = {                                                                                              // 257
  $and: function (subSelector, matcher, inElemMatch) {                                                                 // 258
    return andDocumentMatchers(compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch));                    // 259
  },                                                                                                                   // 262
  $or: function (subSelector, matcher, inElemMatch) {                                                                  // 264
    var matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch); // Special case: if there is only one matcher, use it directly, *preserving*
    // any arrayIndices it returns.                                                                                    // 272
                                                                                                                       //
    if (matchers.length === 1) {                                                                                       // 273
      return matchers[0];                                                                                              // 274
    }                                                                                                                  // 275
                                                                                                                       //
    return function (doc) {                                                                                            // 277
      var result = matchers.some(function (fn) {                                                                       // 278
        return fn(doc).result;                                                                                         // 278
      }); // $or does NOT set arrayIndices when it has multiple                                                        // 278
      // sub-expressions. (Tested against MongoDB.)                                                                    // 280
                                                                                                                       //
      return {                                                                                                         // 281
        result: result                                                                                                 // 281
      };                                                                                                               // 281
    };                                                                                                                 // 282
  },                                                                                                                   // 283
  $nor: function (subSelector, matcher, inElemMatch) {                                                                 // 285
    var matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);                                 // 286
    return function (doc) {                                                                                            // 291
      var result = matchers.every(function (fn) {                                                                      // 292
        return !fn(doc).result;                                                                                        // 292
      }); // Never set arrayIndices, because we only match if nothing in particular                                    // 292
      // 'matched' (and because this is consistent with MongoDB).                                                      // 294
                                                                                                                       //
      return {                                                                                                         // 295
        result: result                                                                                                 // 295
      };                                                                                                               // 295
    };                                                                                                                 // 296
  },                                                                                                                   // 297
  $where: function (selectorValue, matcher) {                                                                          // 299
    // Record that *any* path may be used.                                                                             // 300
    matcher._recordPathUsed('');                                                                                       // 301
                                                                                                                       //
    matcher._hasWhere = true;                                                                                          // 302
                                                                                                                       //
    if (!(selectorValue instanceof Function)) {                                                                        // 304
      // XXX MongoDB seems to have more complex logic to decide where or or not                                        // 305
      // to add 'return'; not sure exactly what it is.                                                                 // 306
      selectorValue = Function('obj', "return " + selectorValue);                                                      // 307
    } // We make the document available as both `this` and `obj`.                                                      // 308
    // // XXX not sure what we should do if this throws                                                                // 311
                                                                                                                       //
                                                                                                                       //
    return function (doc) {                                                                                            // 312
      return {                                                                                                         // 312
        result: selectorValue.call(doc, doc)                                                                           // 312
      };                                                                                                               // 312
    };                                                                                                                 // 312
  },                                                                                                                   // 313
  // This is just used as a comment in the query (in MongoDB, it also ends up in                                       // 315
  // query logs); it has no effect on the actual selection.                                                            // 316
  $comment: function () {                                                                                              // 317
    return function () {                                                                                               // 318
      return {                                                                                                         // 318
        result: true                                                                                                   // 318
      };                                                                                                               // 318
    };                                                                                                                 // 318
  }                                                                                                                    // 319
}; // Operators that (unlike LOGICAL_OPERATORS) pertain to individual paths in a                                       // 257
// document, but (unlike ELEMENT_OPERATORS) do not have a simple definition as                                         // 323
// "match each branched value independently and combine with                                                           // 324
// convertElementMatcherToBranchedMatcher".                                                                            // 325
                                                                                                                       //
var VALUE_OPERATORS = {                                                                                                // 326
  $eq: function (operand) {                                                                                            // 327
    return convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand));                                    // 328
  },                                                                                                                   // 331
  $not: function (operand, valueSelector, matcher) {                                                                   // 332
    return invertBranchedMatcher(compileValueSelector(operand, matcher));                                              // 333
  },                                                                                                                   // 334
  $ne: function (operand) {                                                                                            // 335
    return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand)));             // 336
  },                                                                                                                   // 339
  $nin: function (operand) {                                                                                           // 340
    return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(ELEMENT_OPERATORS.$in.compileElementSelector(operand)));
  },                                                                                                                   // 346
  $exists: function (operand) {                                                                                        // 347
    var exists = convertElementMatcherToBranchedMatcher(function (value) {                                             // 348
      return value !== undefined;                                                                                      // 349
    });                                                                                                                // 349
    return operand ? exists : invertBranchedMatcher(exists);                                                           // 351
  },                                                                                                                   // 352
  // $options just provides options for $regex; its logic is inside $regex                                             // 353
  $options: function (operand, valueSelector) {                                                                        // 354
    if (!hasOwn.call(valueSelector, '$regex')) {                                                                       // 355
      throw Error('$options needs a $regex');                                                                          // 356
    }                                                                                                                  // 357
                                                                                                                       //
    return everythingMatcher;                                                                                          // 359
  },                                                                                                                   // 360
  // $maxDistance is basically an argument to $near                                                                    // 361
  $maxDistance: function (operand, valueSelector) {                                                                    // 362
    if (!valueSelector.$near) {                                                                                        // 363
      throw Error('$maxDistance needs a $near');                                                                       // 364
    }                                                                                                                  // 365
                                                                                                                       //
    return everythingMatcher;                                                                                          // 367
  },                                                                                                                   // 368
  $all: function (operand, valueSelector, matcher) {                                                                   // 369
    if (!Array.isArray(operand)) {                                                                                     // 370
      throw Error('$all requires array');                                                                              // 371
    } // Not sure why, but this seems to be what MongoDB does.                                                         // 372
                                                                                                                       //
                                                                                                                       //
    if (operand.length === 0) {                                                                                        // 375
      return nothingMatcher;                                                                                           // 376
    }                                                                                                                  // 377
                                                                                                                       //
    var branchedMatchers = operand.map(function (criterion) {                                                          // 379
      // XXX handle $all/$elemMatch combination                                                                        // 380
      if (isOperatorObject(criterion)) {                                                                               // 381
        throw Error('no $ expressions in $all');                                                                       // 382
      } // This is always a regexp or equality selector.                                                               // 383
                                                                                                                       //
                                                                                                                       //
      return compileValueSelector(criterion, matcher);                                                                 // 386
    }); // andBranchedMatchers does NOT require all selectors to return true on the                                    // 387
    // SAME branch.                                                                                                    // 390
                                                                                                                       //
    return andBranchedMatchers(branchedMatchers);                                                                      // 391
  },                                                                                                                   // 392
  $near: function (operand, valueSelector, matcher, isRoot) {                                                          // 393
    if (!isRoot) {                                                                                                     // 394
      throw Error('$near can\'t be inside another $ operator');                                                        // 395
    }                                                                                                                  // 396
                                                                                                                       //
    matcher._hasGeoQuery = true; // There are two kinds of geodata in MongoDB: legacy coordinate pairs and             // 398
    // GeoJSON. They use different distance metrics, too. GeoJSON queries are                                          // 401
    // marked with a $geometry property, though legacy coordinates can be                                              // 402
    // matched using $geometry.                                                                                        // 403
                                                                                                                       //
    var maxDistance = void 0,                                                                                          // 404
        point = void 0,                                                                                                // 404
        distance = void 0;                                                                                             // 404
                                                                                                                       //
    if (LocalCollection._isPlainObject(operand) && hasOwn.call(operand, '$geometry')) {                                // 405
      // GeoJSON "2dsphere" mode.                                                                                      // 406
      maxDistance = operand.$maxDistance;                                                                              // 407
      point = operand.$geometry;                                                                                       // 408
                                                                                                                       //
      distance = function (value) {                                                                                    // 409
        // XXX: for now, we don't calculate the actual distance between, say,                                          // 410
        // polygon and circle. If people care about this use-case it will get                                          // 411
        // a priority.                                                                                                 // 412
        if (!value) {                                                                                                  // 413
          return null;                                                                                                 // 414
        }                                                                                                              // 415
                                                                                                                       //
        if (!value.type) {                                                                                             // 417
          return GeoJSON.pointDistance(point, {                                                                        // 418
            type: 'Point',                                                                                             // 420
            coordinates: pointToArray(value)                                                                           // 420
          });                                                                                                          // 420
        }                                                                                                              // 422
                                                                                                                       //
        if (value.type === 'Point') {                                                                                  // 424
          return GeoJSON.pointDistance(point, value);                                                                  // 425
        }                                                                                                              // 426
                                                                                                                       //
        return GeoJSON.geometryWithinRadius(value, point, maxDistance) ? 0 : maxDistance + 1;                          // 428
      };                                                                                                               // 431
    } else {                                                                                                           // 432
      maxDistance = valueSelector.$maxDistance;                                                                        // 433
                                                                                                                       //
      if (!isIndexable(operand)) {                                                                                     // 435
        throw Error('$near argument must be coordinate pair or GeoJSON');                                              // 436
      }                                                                                                                // 437
                                                                                                                       //
      point = pointToArray(operand);                                                                                   // 439
                                                                                                                       //
      distance = function (value) {                                                                                    // 441
        if (!isIndexable(value)) {                                                                                     // 442
          return null;                                                                                                 // 443
        }                                                                                                              // 444
                                                                                                                       //
        return distanceCoordinatePairs(point, value);                                                                  // 446
      };                                                                                                               // 447
    }                                                                                                                  // 448
                                                                                                                       //
    return function (branchedValues) {                                                                                 // 450
      // There might be multiple points in the document that match the given                                           // 451
      // field. Only one of them needs to be within $maxDistance, but we need to                                       // 452
      // evaluate all of them and use the nearest one for the implicit sort                                            // 453
      // specifier. (That's why we can't just use ELEMENT_OPERATORS here.)                                             // 454
      //                                                                                                               // 455
      // Note: This differs from MongoDB's implementation, where a document will                                       // 456
      // actually show up *multiple times* in the result set, with one entry for                                       // 457
      // each within-$maxDistance branching point.                                                                     // 458
      var result = {                                                                                                   // 459
        result: false                                                                                                  // 459
      };                                                                                                               // 459
      expandArraysInBranches(branchedValues).every(function (branch) {                                                 // 460
        // if operation is an update, don't skip branches, just return the first                                       // 461
        // one (#3599)                                                                                                 // 462
        var curDistance = void 0;                                                                                      // 463
                                                                                                                       //
        if (!matcher._isUpdate) {                                                                                      // 464
          if (!((0, _typeof3.default)(branch.value) === 'object')) {                                                   // 465
            return true;                                                                                               // 466
          }                                                                                                            // 467
                                                                                                                       //
          curDistance = distance(branch.value); // Skip branches that aren't real points or are too far away.          // 469
                                                                                                                       //
          if (curDistance === null || curDistance > maxDistance) {                                                     // 472
            return true;                                                                                               // 473
          } // Skip anything that's a tie.                                                                             // 474
                                                                                                                       //
                                                                                                                       //
          if (result.distance !== undefined && result.distance <= curDistance) {                                       // 477
            return true;                                                                                               // 478
          }                                                                                                            // 479
        }                                                                                                              // 480
                                                                                                                       //
        result.result = true;                                                                                          // 482
        result.distance = curDistance;                                                                                 // 483
                                                                                                                       //
        if (branch.arrayIndices) {                                                                                     // 485
          result.arrayIndices = branch.arrayIndices;                                                                   // 486
        } else {                                                                                                       // 487
          delete result.arrayIndices;                                                                                  // 488
        }                                                                                                              // 489
                                                                                                                       //
        return !matcher._isUpdate;                                                                                     // 491
      });                                                                                                              // 492
      return result;                                                                                                   // 494
    };                                                                                                                 // 495
  }                                                                                                                    // 496
}; // NB: We are cheating and using this function to implement 'AND' for both                                          // 326
// 'document matchers' and 'branched matchers'. They both return result objects                                        // 500
// but the argument is different: for the former it's a whole doc, whereas for                                         // 501
// the latter it's an array of 'branched values'.                                                                      // 502
                                                                                                                       //
function andSomeMatchers(subMatchers) {                                                                                // 503
  if (subMatchers.length === 0) {                                                                                      // 504
    return everythingMatcher;                                                                                          // 505
  }                                                                                                                    // 506
                                                                                                                       //
  if (subMatchers.length === 1) {                                                                                      // 508
    return subMatchers[0];                                                                                             // 509
  }                                                                                                                    // 510
                                                                                                                       //
  return function (docOrBranches) {                                                                                    // 512
    var match = {};                                                                                                    // 513
    match.result = subMatchers.every(function (fn) {                                                                   // 514
      var subResult = fn(docOrBranches); // Copy a 'distance' number out of the first sub-matcher that has             // 515
      // one. Yes, this means that if there are multiple $near fields in a                                             // 518
      // query, something arbitrary happens; this appears to be consistent with                                        // 519
      // Mongo.                                                                                                        // 520
                                                                                                                       //
      if (subResult.result && subResult.distance !== undefined && match.distance === undefined) {                      // 521
        match.distance = subResult.distance;                                                                           // 524
      } // Similarly, propagate arrayIndices from sub-matchers... but to match                                         // 525
      // MongoDB behavior, this time the *last* sub-matcher with arrayIndices                                          // 528
      // wins.                                                                                                         // 529
                                                                                                                       //
                                                                                                                       //
      if (subResult.result && subResult.arrayIndices) {                                                                // 530
        match.arrayIndices = subResult.arrayIndices;                                                                   // 531
      }                                                                                                                // 532
                                                                                                                       //
      return subResult.result;                                                                                         // 534
    }); // If we didn't actually match, forget any extra metadata we came up with.                                     // 535
                                                                                                                       //
    if (!match.result) {                                                                                               // 538
      delete match.distance;                                                                                           // 539
      delete match.arrayIndices;                                                                                       // 540
    }                                                                                                                  // 541
                                                                                                                       //
    return match;                                                                                                      // 543
  };                                                                                                                   // 544
}                                                                                                                      // 545
                                                                                                                       //
var andDocumentMatchers = andSomeMatchers;                                                                             // 547
var andBranchedMatchers = andSomeMatchers;                                                                             // 548
                                                                                                                       //
function compileArrayOfDocumentSelectors(selectors, matcher, inElemMatch) {                                            // 550
  if (!Array.isArray(selectors) || selectors.length === 0) {                                                           // 551
    throw Error('$and/$or/$nor must be nonempty array');                                                               // 552
  }                                                                                                                    // 553
                                                                                                                       //
  return selectors.map(function (subSelector) {                                                                        // 555
    if (!LocalCollection._isPlainObject(subSelector)) {                                                                // 556
      throw Error('$or/$and/$nor entries need to be full objects');                                                    // 557
    }                                                                                                                  // 558
                                                                                                                       //
    return compileDocumentSelector(subSelector, matcher, {                                                             // 560
      inElemMatch: inElemMatch                                                                                         // 560
    });                                                                                                                // 560
  });                                                                                                                  // 561
} // Takes in a selector that could match a full document (eg, the original                                            // 562
// selector). Returns a function mapping document->result object.                                                      // 565
//                                                                                                                     // 566
// matcher is the Matcher object we are compiling.                                                                     // 567
//                                                                                                                     // 568
// If this is the root document selector (ie, not wrapped in $and or the like),                                        // 569
// then isRoot is true. (This is used by $near.)                                                                       // 570
                                                                                                                       //
                                                                                                                       //
function compileDocumentSelector(docSelector, matcher) {                                                               // 571
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                                // 571
  var docMatchers = Object.keys(docSelector).map(function (key) {                                                      // 572
    var subSelector = docSelector[key];                                                                                // 573
                                                                                                                       //
    if (key.substr(0, 1) === '$') {                                                                                    // 575
      // Outer operators are either logical operators (they recurse back into                                          // 576
      // this function), or $where.                                                                                    // 577
      if (!hasOwn.call(LOGICAL_OPERATORS, key)) {                                                                      // 578
        throw new Error("Unrecognized logical operator: " + key);                                                      // 579
      }                                                                                                                // 580
                                                                                                                       //
      matcher._isSimple = false;                                                                                       // 582
      return LOGICAL_OPERATORS[key](subSelector, matcher, options.inElemMatch);                                        // 583
    } // Record this path, but only if we aren't in an elemMatcher, since in an                                        // 584
    // elemMatch this is a path inside an object in an array, not in the doc                                           // 587
    // root.                                                                                                           // 588
                                                                                                                       //
                                                                                                                       //
    if (!options.inElemMatch) {                                                                                        // 589
      matcher._recordPathUsed(key);                                                                                    // 590
    } // Don't add a matcher if subSelector is a function -- this is to match                                          // 591
    // the behavior of Meteor on the server (inherited from the node mongodb                                           // 594
    // driver), which is to ignore any part of a selector which is a function.                                         // 595
                                                                                                                       //
                                                                                                                       //
    if (typeof subSelector === 'function') {                                                                           // 596
      return undefined;                                                                                                // 597
    }                                                                                                                  // 598
                                                                                                                       //
    var lookUpByIndex = makeLookupFunction(key);                                                                       // 600
    var valueMatcher = compileValueSelector(subSelector, matcher, options.isRoot);                                     // 601
    return function (doc) {                                                                                            // 607
      return valueMatcher(lookUpByIndex(doc));                                                                         // 607
    };                                                                                                                 // 607
  }).filter(Boolean);                                                                                                  // 608
  return andDocumentMatchers(docMatchers);                                                                             // 610
}                                                                                                                      // 611
                                                                                                                       //
// Takes in a selector that could match a key-indexed value in a document; eg,                                         // 613
// {$gt: 5, $lt: 9}, or a regular expression, or any non-expression object (to                                         // 614
// indicate equality).  Returns a branched matcher: a function mapping                                                 // 615
// [branched value]->result object.                                                                                    // 616
function compileValueSelector(valueSelector, matcher, isRoot) {                                                        // 617
  if (valueSelector instanceof RegExp) {                                                                               // 618
    matcher._isSimple = false;                                                                                         // 619
    return convertElementMatcherToBranchedMatcher(regexpElementMatcher(valueSelector));                                // 620
  }                                                                                                                    // 623
                                                                                                                       //
  if (isOperatorObject(valueSelector)) {                                                                               // 625
    return operatorBranchedMatcher(valueSelector, matcher, isRoot);                                                    // 626
  }                                                                                                                    // 627
                                                                                                                       //
  return convertElementMatcherToBranchedMatcher(equalityElementMatcher(valueSelector));                                // 629
} // Given an element matcher (which evaluates a single value), returns a branched                                     // 632
// value (which evaluates the element matcher on all the branches and returns a                                        // 635
// more structured return value possibly including arrayIndices).                                                      // 636
                                                                                                                       //
                                                                                                                       //
function convertElementMatcherToBranchedMatcher(elementMatcher) {                                                      // 637
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                                // 637
  return function (branches) {                                                                                         // 638
    var expanded = options.dontExpandLeafArrays ? branches : expandArraysInBranches(branches, options.dontIncludeLeafArrays);
    var match = {};                                                                                                    // 643
    match.result = expanded.some(function (element) {                                                                  // 644
      var matched = elementMatcher(element.value); // Special case for $elemMatch: it means "true, and use this as an array
      // index if I didn't already have one".                                                                          // 648
                                                                                                                       //
      if (typeof matched === 'number') {                                                                               // 649
        // XXX This code dates from when we only stored a single array index                                           // 650
        // (for the outermost array). Should we be also including deeper array                                         // 651
        // indices from the $elemMatch match?                                                                          // 652
        if (!element.arrayIndices) {                                                                                   // 653
          element.arrayIndices = [matched];                                                                            // 654
        }                                                                                                              // 655
                                                                                                                       //
        matched = true;                                                                                                // 657
      } // If some element matched, and it's tagged with array indices, include                                        // 658
      // those indices in our result object.                                                                           // 661
                                                                                                                       //
                                                                                                                       //
      if (matched && element.arrayIndices) {                                                                           // 662
        match.arrayIndices = element.arrayIndices;                                                                     // 663
      }                                                                                                                // 664
                                                                                                                       //
      return matched;                                                                                                  // 666
    });                                                                                                                // 667
    return match;                                                                                                      // 669
  };                                                                                                                   // 670
} // Helpers for $near.                                                                                                // 671
                                                                                                                       //
                                                                                                                       //
function distanceCoordinatePairs(a, b) {                                                                               // 674
  var pointA = pointToArray(a);                                                                                        // 675
  var pointB = pointToArray(b);                                                                                        // 676
  return Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]);                                                     // 678
} // Takes something that is not an operator object and returns an element matcher                                     // 679
// for equality with that thing.                                                                                       // 682
                                                                                                                       //
                                                                                                                       //
function equalityElementMatcher(elementSelector) {                                                                     // 683
  if (isOperatorObject(elementSelector)) {                                                                             // 684
    throw Error('Can\'t create equalityValueSelector for operator object');                                            // 685
  } // Special-case: null and undefined are equal (if you got undefined in there                                       // 686
  // somewhere, or if you got it due to some branch being non-existent in the                                          // 689
  // weird special case), even though they aren't with EJSON.equals.                                                   // 690
  // undefined or null                                                                                                 // 691
                                                                                                                       //
                                                                                                                       //
  if (elementSelector == null) {                                                                                       // 692
    return function (value) {                                                                                          // 693
      return value == null;                                                                                            // 693
    };                                                                                                                 // 693
  }                                                                                                                    // 694
                                                                                                                       //
  return function (value) {                                                                                            // 696
    return LocalCollection._f._equal(elementSelector, value);                                                          // 696
  };                                                                                                                   // 696
}                                                                                                                      // 697
                                                                                                                       //
function everythingMatcher(docOrBranchedValues) {                                                                      // 699
  return {                                                                                                             // 700
    result: true                                                                                                       // 700
  };                                                                                                                   // 700
}                                                                                                                      // 701
                                                                                                                       //
function expandArraysInBranches(branches, skipTheArrays) {                                                             // 703
  var branchesOut = [];                                                                                                // 704
  branches.forEach(function (branch) {                                                                                 // 706
    var thisIsArray = Array.isArray(branch.value); // We include the branch itself, *UNLESS* we it's an array that we're going
    // to iterate and we're told to skip arrays.  (That's right, we include some                                       // 710
    // arrays even skipTheArrays is true: these are arrays that were found via                                         // 711
    // explicit numerical indices.)                                                                                    // 712
                                                                                                                       //
    if (!(skipTheArrays && thisIsArray && !branch.dontIterate)) {                                                      // 713
      branchesOut.push({                                                                                               // 714
        arrayIndices: branch.arrayIndices,                                                                             // 714
        value: branch.value                                                                                            // 714
      });                                                                                                              // 714
    }                                                                                                                  // 715
                                                                                                                       //
    if (thisIsArray && !branch.dontIterate) {                                                                          // 717
      branch.value.forEach(function (value, i) {                                                                       // 718
        branchesOut.push({                                                                                             // 719
          arrayIndices: (branch.arrayIndices || []).concat(i),                                                         // 720
          value: value                                                                                                 // 721
        });                                                                                                            // 719
      });                                                                                                              // 723
    }                                                                                                                  // 724
  });                                                                                                                  // 725
  return branchesOut;                                                                                                  // 727
}                                                                                                                      // 728
                                                                                                                       //
// Helpers for $bitsAllSet/$bitsAnySet/$bitsAllClear/$bitsAnyClear.                                                    // 730
function getOperandBitmask(operand, selector) {                                                                        // 731
  // numeric bitmask                                                                                                   // 732
  // You can provide a numeric bitmask to be matched against the operand field.                                        // 733
  // It must be representable as a non-negative 32-bit signed integer.                                                 // 734
  // Otherwise, $bitsAllSet will return an error.                                                                      // 735
  if (Number.isInteger(operand) && operand >= 0) {                                                                     // 736
    return new Uint8Array(new Int32Array([operand]).buffer);                                                           // 737
  } // bindata bitmask                                                                                                 // 738
  // You can also use an arbitrarily large BinData instance as a bitmask.                                              // 741
                                                                                                                       //
                                                                                                                       //
  if (EJSON.isBinary(operand)) {                                                                                       // 742
    return new Uint8Array(operand.buffer);                                                                             // 743
  } // position list                                                                                                   // 744
  // If querying a list of bit positions, each <position> must be a non-negative                                       // 747
  // integer. Bit positions start at 0 from the least significant bit.                                                 // 748
                                                                                                                       //
                                                                                                                       //
  if (Array.isArray(operand) && operand.every(function (x) {                                                           // 749
    return Number.isInteger(x) && x >= 0;                                                                              // 750
  })) {                                                                                                                // 750
    var buffer = new ArrayBuffer((Math.max.apply(Math, (0, _toConsumableArray3.default)(operand)) >> 3) + 1);          // 751
    var view = new Uint8Array(buffer);                                                                                 // 752
    operand.forEach(function (x) {                                                                                     // 754
      view[x >> 3] |= 1 << (x & 0x7);                                                                                  // 755
    });                                                                                                                // 756
    return view;                                                                                                       // 758
  } // bad operand                                                                                                     // 759
                                                                                                                       //
                                                                                                                       //
  throw Error("operand to " + selector + " must be a numeric bitmask (representable as a " + 'non-negative 32-bit signed integer), a bindata bitmask or an array with ' + 'bit positions (non-negative integers)');
}                                                                                                                      // 767
                                                                                                                       //
function getValueBitmask(value, length) {                                                                              // 769
  // The field value must be either numerical or a BinData instance. Otherwise,                                        // 770
  // $bits... will not match the current document.                                                                     // 771
  // numerical                                                                                                         // 773
  if (Number.isSafeInteger(value)) {                                                                                   // 774
    // $bits... will not match numerical values that cannot be represented as a                                        // 775
    // signed 64-bit integer. This can be the case if a value is either too                                            // 776
    // large or small to fit in a signed 64-bit integer, or if it has a                                                // 777
    // fractional component.                                                                                           // 778
    var buffer = new ArrayBuffer(Math.max(length, 2 * Uint32Array.BYTES_PER_ELEMENT));                                 // 779
    var view = new Uint32Array(buffer, 0, 2);                                                                          // 783
    view[0] = value % ((1 << 16) * (1 << 16)) | 0;                                                                     // 784
    view[1] = value / ((1 << 16) * (1 << 16)) | 0; // sign extension                                                   // 785
                                                                                                                       //
    if (value < 0) {                                                                                                   // 788
      view = new Uint8Array(buffer, 2);                                                                                // 789
      view.forEach(function (byte, i) {                                                                                // 790
        view[i] = 0xff;                                                                                                // 791
      });                                                                                                              // 792
    }                                                                                                                  // 793
                                                                                                                       //
    return new Uint8Array(buffer);                                                                                     // 795
  } // bindata                                                                                                         // 796
                                                                                                                       //
                                                                                                                       //
  if (EJSON.isBinary(value)) {                                                                                         // 799
    return new Uint8Array(value.buffer);                                                                               // 800
  } // no match                                                                                                        // 801
                                                                                                                       //
                                                                                                                       //
  return false;                                                                                                        // 804
} // Actually inserts a key value into the selector document                                                           // 805
// However, this checks there is no ambiguity in setting                                                               // 808
// the value for the given key, throws otherwise                                                                       // 809
                                                                                                                       //
                                                                                                                       //
function insertIntoDocument(document, key, value) {                                                                    // 810
  Object.keys(document).forEach(function (existingKey) {                                                               // 811
    if (existingKey.length > key.length && existingKey.indexOf(key + ".") === 0 || key.length > existingKey.length && key.indexOf(existingKey + ".") === 0) {
      throw new Error("cannot infer query fields to set, both paths '" + existingKey + "' and " + ("'" + key + "' are matched"));
    } else if (existingKey === key) {                                                                                  // 820
      throw new Error("cannot infer query fields to set, path '" + key + "' is matched twice");                        // 821
    }                                                                                                                  // 824
  });                                                                                                                  // 825
  document[key] = value;                                                                                               // 827
} // Returns a branched matcher that matches iff the given matcher does not.                                           // 828
// Note that this implicitly "deMorganizes" the wrapped function.  ie, it                                              // 831
// means that ALL branch values need to fail to match innerBranchedMatcher.                                            // 832
                                                                                                                       //
                                                                                                                       //
function invertBranchedMatcher(branchedMatcher) {                                                                      // 833
  return function (branchValues) {                                                                                     // 834
    // We explicitly choose to strip arrayIndices here: it doesn't make sense to                                       // 835
    // say "update the array element that does not match something", at least                                          // 836
    // in mongo-land.                                                                                                  // 837
    return {                                                                                                           // 838
      result: !branchedMatcher(branchValues).result                                                                    // 838
    };                                                                                                                 // 838
  };                                                                                                                   // 839
}                                                                                                                      // 840
                                                                                                                       //
function isIndexable(obj) {                                                                                            // 842
  return Array.isArray(obj) || LocalCollection._isPlainObject(obj);                                                    // 843
}                                                                                                                      // 844
                                                                                                                       //
function isNumericKey(s) {                                                                                             // 846
  return (/^[0-9]+$/.test(s)                                                                                           // 847
  );                                                                                                                   // 847
}                                                                                                                      // 848
                                                                                                                       //
function isOperatorObject(valueSelector, inconsistentOK) {                                                             // 853
  if (!LocalCollection._isPlainObject(valueSelector)) {                                                                // 854
    return false;                                                                                                      // 855
  }                                                                                                                    // 856
                                                                                                                       //
  var theseAreOperators = undefined;                                                                                   // 858
  Object.keys(valueSelector).forEach(function (selKey) {                                                               // 859
    var thisIsOperator = selKey.substr(0, 1) === '$';                                                                  // 860
                                                                                                                       //
    if (theseAreOperators === undefined) {                                                                             // 862
      theseAreOperators = thisIsOperator;                                                                              // 863
    } else if (theseAreOperators !== thisIsOperator) {                                                                 // 864
      if (!inconsistentOK) {                                                                                           // 865
        throw new Error("Inconsistent operator: " + JSON.stringify(valueSelector));                                    // 866
      }                                                                                                                // 869
                                                                                                                       //
      theseAreOperators = false;                                                                                       // 871
    }                                                                                                                  // 872
  });                                                                                                                  // 873
  return !!theseAreOperators; // {} has no operators                                                                   // 875
}                                                                                                                      // 876
                                                                                                                       //
// Helper for $lt/$gt/$lte/$gte.                                                                                       // 878
function makeInequality(cmpValueComparator) {                                                                          // 879
  return {                                                                                                             // 880
    compileElementSelector: function (operand) {                                                                       // 881
      // Arrays never compare false with non-arrays for any inequality.                                                // 882
      // XXX This was behavior we observed in pre-release MongoDB 2.5, but                                             // 883
      //     it seems to have been reverted.                                                                           // 884
      //     See https://jira.mongodb.org/browse/SERVER-11444                                                          // 885
      if (Array.isArray(operand)) {                                                                                    // 886
        return function () {                                                                                           // 887
          return false;                                                                                                // 887
        };                                                                                                             // 887
      } // Special case: consider undefined and null the same (so true with                                            // 888
      // $gte/$lte).                                                                                                   // 891
                                                                                                                       //
                                                                                                                       //
      if (operand === undefined) {                                                                                     // 892
        operand = null;                                                                                                // 893
      }                                                                                                                // 894
                                                                                                                       //
      var operandType = LocalCollection._f._type(operand);                                                             // 896
                                                                                                                       //
      return function (value) {                                                                                        // 898
        if (value === undefined) {                                                                                     // 899
          value = null;                                                                                                // 900
        } // Comparisons are never true among things of different type (except                                         // 901
        // null vs undefined).                                                                                         // 904
                                                                                                                       //
                                                                                                                       //
        if (LocalCollection._f._type(value) !== operandType) {                                                         // 905
          return false;                                                                                                // 906
        }                                                                                                              // 907
                                                                                                                       //
        return cmpValueComparator(LocalCollection._f._cmp(value, operand));                                            // 909
      };                                                                                                               // 910
    }                                                                                                                  // 911
  };                                                                                                                   // 880
} // makeLookupFunction(key) returns a lookup function.                                                                // 913
//                                                                                                                     // 916
// A lookup function takes in a document and returns an array of matching                                              // 917
// branches.  If no arrays are found while looking up the key, this array will                                         // 918
// have exactly one branches (possibly 'undefined', if some segment of the key                                         // 919
// was not found).                                                                                                     // 920
//                                                                                                                     // 921
// If arrays are found in the middle, this can have more than one element, since                                       // 922
// we 'branch'. When we 'branch', if there are more key segments to look up,                                           // 923
// then we only pursue branches that are plain objects (not arrays or scalars).                                        // 924
// This means we can actually end up with no branches!                                                                 // 925
//                                                                                                                     // 926
// We do *NOT* branch on arrays that are found at the end (ie, at the last                                             // 927
// dotted member of the key). We just return that array; if you want to                                                // 928
// effectively 'branch' over the array's values, post-process the lookup                                               // 929
// function with expandArraysInBranches.                                                                               // 930
//                                                                                                                     // 931
// Each branch is an object with keys:                                                                                 // 932
//  - value: the value at the branch                                                                                   // 933
//  - dontIterate: an optional bool; if true, it means that 'value' is an array                                        // 934
//    that expandArraysInBranches should NOT expand. This specifically happens                                         // 935
//    when there is a numeric index in the key, and ensures the                                                        // 936
//    perhaps-surprising MongoDB behavior where {'a.0': 5} does NOT                                                    // 937
//    match {a: [[5]]}.                                                                                                // 938
//  - arrayIndices: if any array indexing was done during lookup (either due to                                        // 939
//    explicit numeric indices or implicit branching), this will be an array of                                        // 940
//    the array indices used, from outermost to innermost; it is falsey or                                             // 941
//    absent if no array index is used. If an explicit numeric index is used,                                          // 942
//    the index will be followed in arrayIndices by the string 'x'.                                                    // 943
//                                                                                                                     // 944
//    Note: arrayIndices is used for two purposes. First, it is used to                                                // 945
//    implement the '$' modifier feature, which only ever looks at its first                                           // 946
//    element.                                                                                                         // 947
//                                                                                                                     // 948
//    Second, it is used for sort key generation, which needs to be able to tell                                       // 949
//    the difference between different paths. Moreover, it needs to                                                    // 950
//    differentiate between explicit and implicit branching, which is why                                              // 951
//    there's the somewhat hacky 'x' entry: this means that explicit and                                               // 952
//    implicit array lookups will have different full arrayIndices paths. (That                                        // 953
//    code only requires that different paths have different arrayIndices; it                                          // 954
//    doesn't actually 'parse' arrayIndices. As an alternative, arrayIndices                                           // 955
//    could contain objects with flags like 'implicit', but I think that only                                          // 956
//    makes the code surrounding them more complex.)                                                                   // 957
//                                                                                                                     // 958
//    (By the way, this field ends up getting passed around a lot without                                              // 959
//    cloning, so never mutate any arrayIndices field/var in this package!)                                            // 960
//                                                                                                                     // 961
//                                                                                                                     // 962
// At the top level, you may only pass in a plain object or array.                                                     // 963
//                                                                                                                     // 964
// See the test 'minimongo - lookup' for some examples of what lookup functions                                        // 965
// return.                                                                                                             // 966
                                                                                                                       //
                                                                                                                       //
function makeLookupFunction(key) {                                                                                     // 967
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                                // 967
  var parts = key.split('.');                                                                                          // 968
  var firstPart = parts.length ? parts[0] : '';                                                                        // 969
  var lookupRest = parts.length > 1 && makeLookupFunction(parts.slice(1).join('.'));                                   // 970
                                                                                                                       //
  var omitUnnecessaryFields = function (result) {                                                                      // 975
    if (!result.dontIterate) {                                                                                         // 976
      delete result.dontIterate;                                                                                       // 977
    }                                                                                                                  // 978
                                                                                                                       //
    if (result.arrayIndices && !result.arrayIndices.length) {                                                          // 980
      delete result.arrayIndices;                                                                                      // 981
    }                                                                                                                  // 982
                                                                                                                       //
    return result;                                                                                                     // 984
  }; // Doc will always be a plain object or an array.                                                                 // 985
  // apply an explicit numeric index, an array.                                                                        // 988
                                                                                                                       //
                                                                                                                       //
  return function (doc) {                                                                                              // 989
    var arrayIndices = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];                         // 989
                                                                                                                       //
    if (Array.isArray(doc)) {                                                                                          // 990
      // If we're being asked to do an invalid lookup into an array (non-integer                                       // 991
      // or out-of-bounds), return no results (which is different from returning                                       // 992
      // a single undefined result, in that `null` equality checks won't match).                                       // 993
      if (!(isNumericKey(firstPart) && firstPart < doc.length)) {                                                      // 994
        return [];                                                                                                     // 995
      } // Remember that we used this array index. Include an 'x' to indicate that                                     // 996
      // the previous index came from being considered as an explicit array                                            // 999
      // index (not branching).                                                                                        // 1000
                                                                                                                       //
                                                                                                                       //
      arrayIndices = arrayIndices.concat(+firstPart, 'x');                                                             // 1001
    } // Do our first lookup.                                                                                          // 1002
                                                                                                                       //
                                                                                                                       //
    var firstLevel = doc[firstPart]; // If there is no deeper to dig, return what we found.                            // 1005
    //                                                                                                                 // 1008
    // If what we found is an array, most value selectors will choose to treat                                         // 1009
    // the elements of the array as matchable values in their own right, but                                           // 1010
    // that's done outside of the lookup function. (Exceptions to this are $size                                       // 1011
    // and stuff relating to $elemMatch.  eg, {a: {$size: 2}} does not match {a:                                       // 1012
    // [[1, 2]]}.)                                                                                                     // 1013
    //                                                                                                                 // 1014
    // That said, if we just did an *explicit* array lookup (on doc) to find                                           // 1015
    // firstLevel, and firstLevel is an array too, we do NOT want value                                                // 1016
    // selectors to iterate over it.  eg, {'a.0': 5} does not match {a: [[5]]}.                                        // 1017
    // So in that case, we mark the return value as 'don't iterate'.                                                   // 1018
                                                                                                                       //
    if (!lookupRest) {                                                                                                 // 1019
      return [omitUnnecessaryFields({                                                                                  // 1020
        arrayIndices: arrayIndices,                                                                                    // 1021
        dontIterate: Array.isArray(doc) && Array.isArray(firstLevel),                                                  // 1022
        value: firstLevel                                                                                              // 1023
      })];                                                                                                             // 1020
    } // We need to dig deeper.  But if we can't, because what we've found is not                                      // 1025
    // an array or plain object, we're done. If we just did a numeric index into                                       // 1028
    // an array, we return nothing here (this is a change in Mongo 2.5 from                                            // 1029
    // Mongo 2.4, where {'a.0.b': null} stopped matching {a: [5]}). Otherwise,                                         // 1030
    // return a single `undefined` (which can, for example, match via equality                                         // 1031
    // with `null`).                                                                                                   // 1032
                                                                                                                       //
                                                                                                                       //
    if (!isIndexable(firstLevel)) {                                                                                    // 1033
      if (Array.isArray(doc)) {                                                                                        // 1034
        return [];                                                                                                     // 1035
      }                                                                                                                // 1036
                                                                                                                       //
      return [omitUnnecessaryFields({                                                                                  // 1038
        arrayIndices: arrayIndices,                                                                                    // 1038
        value: undefined                                                                                               // 1038
      })];                                                                                                             // 1038
    }                                                                                                                  // 1039
                                                                                                                       //
    var result = [];                                                                                                   // 1041
                                                                                                                       //
    var appendToResult = function (more) {                                                                             // 1042
      result.push.apply(result, (0, _toConsumableArray3.default)(more));                                               // 1043
    }; // Dig deeper: look up the rest of the parts on whatever we've found.                                           // 1044
    // (lookupRest is smart enough to not try to do invalid lookups into                                               // 1047
    // firstLevel if it's an array.)                                                                                   // 1048
                                                                                                                       //
                                                                                                                       //
    appendToResult(lookupRest(firstLevel, arrayIndices)); // If we found an array, then in *addition* to potentially treating the next
    // part as a literal integer lookup, we should also 'branch': try to look up                                       // 1052
    // the rest of the parts on each array element in parallel.                                                        // 1053
    //                                                                                                                 // 1054
    // In this case, we *only* dig deeper into array elements that are plain                                           // 1055
    // objects. (Recall that we only got this far if we have further to dig.)                                          // 1056
    // This makes sense: we certainly don't dig deeper into non-indexable                                              // 1057
    // objects. And it would be weird to dig into an array: it's simpler to have                                       // 1058
    // a rule that explicit integer indexes only apply to an outer array, not to                                       // 1059
    // an array you find after a branching search.                                                                     // 1060
    //                                                                                                                 // 1061
    // In the special case of a numeric part in a *sort selector* (not a query                                         // 1062
    // selector), we skip the branching: we ONLY allow the numeric part to mean                                        // 1063
    // 'look up this index' in that case, not 'also look up this index in all                                          // 1064
    // the elements of the array'.                                                                                     // 1065
                                                                                                                       //
    if (Array.isArray(firstLevel) && !(isNumericKey(parts[1]) && options.forSort)) {                                   // 1066
      firstLevel.forEach(function (branch, arrayIndex) {                                                               // 1068
        if (LocalCollection._isPlainObject(branch)) {                                                                  // 1069
          appendToResult(lookupRest(branch, arrayIndices.concat(arrayIndex)));                                         // 1070
        }                                                                                                              // 1071
      });                                                                                                              // 1072
    }                                                                                                                  // 1073
                                                                                                                       //
    return result;                                                                                                     // 1075
  };                                                                                                                   // 1076
}                                                                                                                      // 1077
                                                                                                                       //
// Object exported only for unit testing.                                                                              // 1079
// Use it to export private functions to test in Tinytest.                                                             // 1080
MinimongoTest = {                                                                                                      // 1081
  makeLookupFunction: makeLookupFunction                                                                               // 1081
};                                                                                                                     // 1081
                                                                                                                       //
MinimongoError = function (message) {                                                                                  // 1082
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                                // 1082
                                                                                                                       //
  if (typeof message === 'string' && options.field) {                                                                  // 1083
    message += " for field '" + options.field + "'";                                                                   // 1084
  }                                                                                                                    // 1085
                                                                                                                       //
  var error = new Error(message);                                                                                      // 1087
  error.name = 'MinimongoError';                                                                                       // 1088
  return error;                                                                                                        // 1089
};                                                                                                                     // 1090
                                                                                                                       //
function nothingMatcher(docOrBranchedValues) {                                                                         // 1092
  return {                                                                                                             // 1093
    result: false                                                                                                      // 1093
  };                                                                                                                   // 1093
}                                                                                                                      // 1094
                                                                                                                       //
// Takes an operator object (an object with $ keys) and returns a branched                                             // 1096
// matcher for it.                                                                                                     // 1097
function operatorBranchedMatcher(valueSelector, matcher, isRoot) {                                                     // 1098
  // Each valueSelector works separately on the various branches.  So one                                              // 1099
  // operator can match one branch and another can match another branch.  This                                         // 1100
  // is OK.                                                                                                            // 1101
  var operatorMatchers = Object.keys(valueSelector).map(function (operator) {                                          // 1102
    var operand = valueSelector[operator];                                                                             // 1103
    var simpleRange = ['$lt', '$lte', '$gt', '$gte'].includes(operator) && typeof operand === 'number';                // 1105
    var simpleEquality = ['$ne', '$eq'].includes(operator) && operand !== Object(operand);                             // 1110
    var simpleInclusion = ['$in', '$nin'].includes(operator) && Array.isArray(operand) && !operand.some(function (x) {
      return x === Object(x);                                                                                          // 1118
    });                                                                                                                // 1118
                                                                                                                       //
    if (!(simpleRange || simpleInclusion || simpleEquality)) {                                                         // 1121
      matcher._isSimple = false;                                                                                       // 1122
    }                                                                                                                  // 1123
                                                                                                                       //
    if (hasOwn.call(VALUE_OPERATORS, operator)) {                                                                      // 1125
      return VALUE_OPERATORS[operator](operand, valueSelector, matcher, isRoot);                                       // 1126
    }                                                                                                                  // 1127
                                                                                                                       //
    if (hasOwn.call(ELEMENT_OPERATORS, operator)) {                                                                    // 1129
      var options = ELEMENT_OPERATORS[operator];                                                                       // 1130
      return convertElementMatcherToBranchedMatcher(options.compileElementSelector(operand, valueSelector, matcher), options);
    }                                                                                                                  // 1135
                                                                                                                       //
    throw new Error("Unrecognized operator: " + operator);                                                             // 1137
  });                                                                                                                  // 1138
  return andBranchedMatchers(operatorMatchers);                                                                        // 1140
} // paths - Array: list of mongo style paths                                                                          // 1141
// newLeafFn - Function: of form function(path) should return a scalar value to                                        // 1144
//                       put into list created for that path                                                           // 1145
// conflictFn - Function: of form function(node, path, fullPath) is called                                             // 1146
//                        when building a tree path for 'fullPath' node on                                             // 1147
//                        'path' was already a leaf with a value. Must return a                                        // 1148
//                        conflict resolution.                                                                         // 1149
// initial tree - Optional Object: starting tree.                                                                      // 1150
// @returns - Object: tree represented as a set of nested objects                                                      // 1151
                                                                                                                       //
                                                                                                                       //
function pathsToTree(paths, newLeafFn, conflictFn) {                                                                   // 1152
  var root = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};                                   // 1152
  paths.forEach(function (path) {                                                                                      // 1153
    var pathArray = path.split('.');                                                                                   // 1154
    var tree = root; // use .every just for iteration with break                                                       // 1155
                                                                                                                       //
    var success = pathArray.slice(0, -1).every(function (key, i) {                                                     // 1158
      if (!hasOwn.call(tree, key)) {                                                                                   // 1159
        tree[key] = {};                                                                                                // 1160
      } else if (tree[key] !== Object(tree[key])) {                                                                    // 1161
        tree[key] = conflictFn(tree[key], pathArray.slice(0, i + 1).join('.'), path); // break out of loop if we are failing for this path
                                                                                                                       //
        if (tree[key] !== Object(tree[key])) {                                                                         // 1169
          return false;                                                                                                // 1170
        }                                                                                                              // 1171
      }                                                                                                                // 1172
                                                                                                                       //
      tree = tree[key];                                                                                                // 1174
      return true;                                                                                                     // 1176
    });                                                                                                                // 1177
                                                                                                                       //
    if (success) {                                                                                                     // 1179
      var lastKey = pathArray[pathArray.length - 1];                                                                   // 1180
                                                                                                                       //
      if (hasOwn.call(tree, lastKey)) {                                                                                // 1181
        tree[lastKey] = conflictFn(tree[lastKey], path, path);                                                         // 1182
      } else {                                                                                                         // 1183
        tree[lastKey] = newLeafFn(path);                                                                               // 1184
      }                                                                                                                // 1185
    }                                                                                                                  // 1186
  });                                                                                                                  // 1187
  return root;                                                                                                         // 1189
}                                                                                                                      // 1190
                                                                                                                       //
// Makes sure we get 2 elements array and assume the first one to be x and                                             // 1192
// the second one to y no matter what user passes.                                                                     // 1193
// In case user passes { lon: x, lat: y } returns [x, y]                                                               // 1194
function pointToArray(point) {                                                                                         // 1195
  return Array.isArray(point) ? point.slice() : [point.x, point.y];                                                    // 1196
} // Creating a document from an upsert is quite tricky.                                                               // 1197
// E.g. this selector: {"$or": [{"b.foo": {"$all": ["bar"]}}]}, should result                                          // 1200
// in: {"b.foo": "bar"}                                                                                                // 1201
// But this selector: {"$or": [{"b": {"foo": {"$all": ["bar"]}}}]} should throw                                        // 1202
// an error                                                                                                            // 1203
// Some rules (found mainly with trial & error, so there might be more):                                               // 1205
// - handle all childs of $and (or implicit $and)                                                                      // 1206
// - handle $or nodes with exactly 1 child                                                                             // 1207
// - ignore $or nodes with more than 1 child                                                                           // 1208
// - ignore $nor and $not nodes                                                                                        // 1209
// - throw when a value can not be set unambiguously                                                                   // 1210
// - every value for $all should be dealt with as separate $eq-s                                                       // 1211
// - threat all children of $all as $eq setters (=> set if $all.length === 1,                                          // 1212
//   otherwise throw error)                                                                                            // 1213
// - you can not mix '$'-prefixed keys and non-'$'-prefixed keys                                                       // 1214
// - you can only have dotted keys on a root-level                                                                     // 1215
// - you can not have '$'-prefixed keys more than one-level deep in an object                                          // 1216
// Handles one key/value pair to put in the selector document                                                          // 1218
                                                                                                                       //
                                                                                                                       //
function populateDocumentWithKeyValue(document, key, value) {                                                          // 1219
  if (value && Object.getPrototypeOf(value) === Object.prototype) {                                                    // 1220
    populateDocumentWithObject(document, key, value);                                                                  // 1221
  } else if (!(value instanceof RegExp)) {                                                                             // 1222
    insertIntoDocument(document, key, value);                                                                          // 1223
  }                                                                                                                    // 1224
} // Handles a key, value pair to put in the selector document                                                         // 1225
// if the value is an object                                                                                           // 1228
                                                                                                                       //
                                                                                                                       //
function populateDocumentWithObject(document, key, value) {                                                            // 1229
  var keys = Object.keys(value);                                                                                       // 1230
  var unprefixedKeys = keys.filter(function (op) {                                                                     // 1231
    return op[0] !== '$';                                                                                              // 1231
  });                                                                                                                  // 1231
                                                                                                                       //
  if (unprefixedKeys.length > 0 || !keys.length) {                                                                     // 1233
    // Literal (possibly empty) object ( or empty object )                                                             // 1234
    // Don't allow mixing '$'-prefixed with non-'$'-prefixed fields                                                    // 1235
    if (keys.length !== unprefixedKeys.length) {                                                                       // 1236
      throw new Error("unknown operator: " + unprefixedKeys[0]);                                                       // 1237
    }                                                                                                                  // 1238
                                                                                                                       //
    validateObject(value, key);                                                                                        // 1240
    insertIntoDocument(document, key, value);                                                                          // 1241
  } else {                                                                                                             // 1242
    Object.keys(value).forEach(function (op) {                                                                         // 1243
      var object = value[op];                                                                                          // 1244
                                                                                                                       //
      if (op === '$eq') {                                                                                              // 1246
        populateDocumentWithKeyValue(document, key, object);                                                           // 1247
      } else if (op === '$all') {                                                                                      // 1248
        // every value for $all should be dealt with as separate $eq-s                                                 // 1249
        object.forEach(function (element) {                                                                            // 1250
          return populateDocumentWithKeyValue(document, key, element);                                                 // 1250
        });                                                                                                            // 1250
      }                                                                                                                // 1253
    });                                                                                                                // 1254
  }                                                                                                                    // 1255
} // Fills a document with certain fields from an upsert selector                                                      // 1256
                                                                                                                       //
                                                                                                                       //
function populateDocumentWithQueryFields(query) {                                                                      // 1259
  var document = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                               // 1259
                                                                                                                       //
  if (Object.getPrototypeOf(query) === Object.prototype) {                                                             // 1260
    // handle implicit $and                                                                                            // 1261
    Object.keys(query).forEach(function (key) {                                                                        // 1262
      var value = query[key];                                                                                          // 1263
                                                                                                                       //
      if (key === '$and') {                                                                                            // 1265
        // handle explicit $and                                                                                        // 1266
        value.forEach(function (element) {                                                                             // 1267
          return populateDocumentWithQueryFields(element, document);                                                   // 1267
        });                                                                                                            // 1267
      } else if (key === '$or') {                                                                                      // 1270
        // handle $or nodes with exactly 1 child                                                                       // 1271
        if (value.length === 1) {                                                                                      // 1272
          populateDocumentWithQueryFields(value[0], document);                                                         // 1273
        }                                                                                                              // 1274
      } else if (key[0] !== '$') {                                                                                     // 1275
        // Ignore other '$'-prefixed logical selectors                                                                 // 1276
        populateDocumentWithKeyValue(document, key, value);                                                            // 1277
      }                                                                                                                // 1278
    });                                                                                                                // 1279
  } else {                                                                                                             // 1280
    // Handle meteor-specific shortcut for selecting _id                                                               // 1281
    if (LocalCollection._selectorIsId(query)) {                                                                        // 1282
      insertIntoDocument(document, '_id', query);                                                                      // 1283
    }                                                                                                                  // 1284
  }                                                                                                                    // 1285
                                                                                                                       //
  return document;                                                                                                     // 1287
}                                                                                                                      // 1288
                                                                                                                       //
function projectionDetails(fields) {                                                                                   // 1296
  // Find the non-_id keys (_id is handled specially because it is included                                            // 1297
  // unless explicitly excluded). Sort the keys, so that our code to detect                                            // 1298
  // overlaps like 'foo' and 'foo.bar' can assume that 'foo' comes first.                                              // 1299
  var fieldsKeys = Object.keys(fields).sort(); // If _id is the only field in the projection, do not remove it, since it is
  // required to determine if this is an exclusion or exclusion. Also keep an                                          // 1303
  // inclusive _id, since inclusive _id follows the normal rules about mixing                                          // 1304
  // inclusive and exclusive fields. If _id is not the only field in the                                               // 1305
  // projection and is exclusive, remove it so it can be handled later by a                                            // 1306
  // special case, since exclusive _id is always allowed.                                                              // 1307
                                                                                                                       //
  if (!(fieldsKeys.length === 1 && fieldsKeys[0] === '_id') && !(fieldsKeys.includes('_id') && fields._id)) {          // 1308
    fieldsKeys = fieldsKeys.filter(function (key) {                                                                    // 1310
      return key !== '_id';                                                                                            // 1310
    });                                                                                                                // 1310
  }                                                                                                                    // 1311
                                                                                                                       //
  var including = null; // Unknown                                                                                     // 1313
                                                                                                                       //
  fieldsKeys.forEach(function (keyPath) {                                                                              // 1315
    var rule = !!fields[keyPath];                                                                                      // 1316
                                                                                                                       //
    if (including === null) {                                                                                          // 1318
      including = rule;                                                                                                // 1319
    } // This error message is copied from MongoDB shell                                                               // 1320
                                                                                                                       //
                                                                                                                       //
    if (including !== rule) {                                                                                          // 1323
      throw MinimongoError('You cannot currently mix including and excluding fields.');                                // 1324
    }                                                                                                                  // 1327
  });                                                                                                                  // 1328
  var projectionRulesTree = pathsToTree(fieldsKeys, function (path) {                                                  // 1330
    return including;                                                                                                  // 1332
  }, function (node, path, fullPath) {                                                                                 // 1332
    // Check passed projection fields' keys: If you have two rules such as                                             // 1334
    // 'foo.bar' and 'foo.bar.baz', then the result becomes ambiguous. If                                              // 1335
    // that happens, there is a probability you are doing something wrong,                                             // 1336
    // framework should notify you about such mistake earlier on cursor                                                // 1337
    // compilation step than later during runtime.  Note, that real mongo                                              // 1338
    // doesn't do anything about it and the later rule appears in projection                                           // 1339
    // project, more priority it takes.                                                                                // 1340
    //                                                                                                                 // 1341
    // Example, assume following in mongo shell:                                                                       // 1342
    // > db.coll.insert({ a: { b: 23, c: 44 } })                                                                       // 1343
    // > db.coll.find({}, { 'a': 1, 'a.b': 1 })                                                                        // 1344
    // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23}}                                                   // 1345
    // > db.coll.find({}, { 'a.b': 1, 'a': 1 })                                                                        // 1346
    // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23, "c": 44}}                                          // 1347
    //                                                                                                                 // 1348
    // Note, how second time the return set of keys is different.                                                      // 1349
    var currentPath = fullPath;                                                                                        // 1350
    var anotherPath = path;                                                                                            // 1351
    throw MinimongoError("both " + currentPath + " and " + anotherPath + " found in fields option, " + 'using both of them may trigger unexpected behavior. Did you mean to ' + 'use only one of them?');
  });                                                                                                                  // 1357
  return {                                                                                                             // 1359
    including: including,                                                                                              // 1359
    tree: projectionRulesTree                                                                                          // 1359
  };                                                                                                                   // 1359
}                                                                                                                      // 1360
                                                                                                                       //
function regexpElementMatcher(regexp) {                                                                                // 1363
  return function (value) {                                                                                            // 1364
    if (value instanceof RegExp) {                                                                                     // 1365
      return value.toString() === regexp.toString();                                                                   // 1366
    } // Regexps only work against strings.                                                                            // 1367
                                                                                                                       //
                                                                                                                       //
    if (typeof value !== 'string') {                                                                                   // 1370
      return false;                                                                                                    // 1371
    } // Reset regexp's state to avoid inconsistent matching for objects with the                                      // 1372
    // same value on consecutive calls of regexp.test. This happens only if the                                        // 1375
    // regexp has the 'g' flag. Also note that ES6 introduces a new flag 'y' for                                       // 1376
    // which we should *not* change the lastIndex but MongoDB doesn't support                                          // 1377
    // either of these flags.                                                                                          // 1378
                                                                                                                       //
                                                                                                                       //
    regexp.lastIndex = 0;                                                                                              // 1379
    return regexp.test(value);                                                                                         // 1381
  };                                                                                                                   // 1382
}                                                                                                                      // 1383
                                                                                                                       //
// Validates the key in a path.                                                                                        // 1385
// Objects that are nested more then 1 level cannot have dotted fields                                                 // 1386
// or fields starting with '$'                                                                                         // 1387
function validateKeyInPath(key, path) {                                                                                // 1388
  if (key.includes('.')) {                                                                                             // 1389
    throw new Error("The dotted field '" + key + "' in '" + path + "." + key + " is not valid for storage.");          // 1390
  }                                                                                                                    // 1393
                                                                                                                       //
  if (key[0] === '$') {                                                                                                // 1395
    throw new Error("The dollar ($) prefixed field  '" + path + "." + key + " is not valid for storage.");             // 1396
  }                                                                                                                    // 1399
} // Recursively validates an object that is nested more than one level deep                                           // 1400
                                                                                                                       //
                                                                                                                       //
function validateObject(object, path) {                                                                                // 1403
  if (object && Object.getPrototypeOf(object) === Object.prototype) {                                                  // 1404
    Object.keys(object).forEach(function (key) {                                                                       // 1405
      validateKeyInPath(key, path);                                                                                    // 1406
      validateObject(object[key], path + '.' + key);                                                                   // 1407
    });                                                                                                                // 1408
  }                                                                                                                    // 1409
}                                                                                                                      // 1410
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/cursor.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                                //
                                                                                                                       //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  "default": function () {                                                                                             // 1
    return Cursor;                                                                                                     // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
var LocalCollection = void 0;                                                                                          // 1
module.watch(require("./local_collection.js"), {                                                                       // 1
  "default": function (v) {                                                                                            // 1
    LocalCollection = v;                                                                                               // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var hasOwn = void 0;                                                                                                   // 1
module.watch(require("./common.js"), {                                                                                 // 1
  hasOwn: function (v) {                                                                                               // 1
    hasOwn = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 1);                                                                                                                 // 1
                                                                                                                       //
var Cursor = function () {                                                                                             //
  // don't call this ctor directly.  use LocalCollection.find().                                                       // 7
  function Cursor(collection, selector) {                                                                              // 8
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                              // 8
    (0, _classCallCheck3.default)(this, Cursor);                                                                       // 8
    this.collection = collection;                                                                                      // 9
    this.sorter = null;                                                                                                // 10
    this.matcher = new Minimongo.Matcher(selector);                                                                    // 11
                                                                                                                       //
    if (LocalCollection._selectorIsIdPerhapsAsObject(selector)) {                                                      // 13
      // stash for fast _id and { _id }                                                                                // 14
      this._selectorId = hasOwn.call(selector, '_id') ? selector._id : selector;                                       // 15
    } else {                                                                                                           // 18
      this._selectorId = undefined;                                                                                    // 19
                                                                                                                       //
      if (this.matcher.hasGeoQuery() || options.sort) {                                                                // 21
        this.sorter = new Minimongo.Sorter(options.sort || [], {                                                       // 22
          matcher: this.matcher                                                                                        // 24
        });                                                                                                            // 24
      }                                                                                                                // 26
    }                                                                                                                  // 27
                                                                                                                       //
    this.skip = options.skip || 0;                                                                                     // 29
    this.limit = options.limit;                                                                                        // 30
    this.fields = options.fields;                                                                                      // 31
    this._projectionFn = LocalCollection._compileProjection(this.fields || {});                                        // 33
    this._transform = LocalCollection.wrapTransform(options.transform); // by default, queries register w/ Tracker when it is available.
                                                                                                                       //
    if (typeof Tracker !== 'undefined') {                                                                              // 38
      this.reactive = options.reactive === undefined ? true : options.reactive;                                        // 39
    }                                                                                                                  // 40
  } /**                                                                                                                // 41
     * @summary Returns the number of documents that match a query.                                                    //
     * @memberOf Mongo.Cursor                                                                                          //
     * @method  count                                                                                                  //
     * @param {boolean} [applySkipLimit=true] If set to `false`, the value                                             //
     *                                         returned will reflect the total                                         //
     *                                         number of matching documents,                                           //
     *                                         ignoring any value supplied for                                         //
     *                                         limit                                                                   //
     * @instance                                                                                                       //
     * @locus Anywhere                                                                                                 //
     * @returns {Number}                                                                                               //
     */                                                                                                                //
                                                                                                                       //
  Cursor.prototype.count = function () {                                                                               //
    function count() {                                                                                                 //
      var applySkipLimit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;                   // 56
                                                                                                                       //
      if (this.reactive) {                                                                                             // 57
        // allow the observe to be unordered                                                                           // 58
        this._depend({                                                                                                 // 59
          added: true,                                                                                                 // 59
          removed: true                                                                                                // 59
        }, true);                                                                                                      // 59
      }                                                                                                                // 60
                                                                                                                       //
      return this._getRawObjects({                                                                                     // 62
        ordered: true,                                                                                                 // 63
        applySkipLimit: applySkipLimit                                                                                 // 64
      }).length;                                                                                                       // 62
    }                                                                                                                  // 66
                                                                                                                       //
    return count;                                                                                                      //
  }(); /**                                                                                                             //
        * @summary Return all matching documents as an Array.                                                          //
        * @memberOf Mongo.Cursor                                                                                       //
        * @method  fetch                                                                                               //
        * @instance                                                                                                    //
        * @locus Anywhere                                                                                              //
        * @returns {Object[]}                                                                                          //
        */                                                                                                             //
                                                                                                                       //
  Cursor.prototype.fetch = function () {                                                                               //
    function fetch() {                                                                                                 //
      var result = [];                                                                                                 // 77
      this.forEach(function (doc) {                                                                                    // 79
        result.push(doc);                                                                                              // 80
      });                                                                                                              // 81
      return result;                                                                                                   // 83
    }                                                                                                                  // 84
                                                                                                                       //
    return fetch;                                                                                                      //
  }();                                                                                                                 //
                                                                                                                       //
  Cursor.prototype[Symbol.iterator] = function () {                                                                    //
    var _this = this;                                                                                                  // 86
                                                                                                                       //
    if (this.reactive) {                                                                                               // 87
      this._depend({                                                                                                   // 88
        addedBefore: true,                                                                                             // 89
        removed: true,                                                                                                 // 90
        changed: true,                                                                                                 // 91
        movedBefore: true                                                                                              // 92
      });                                                                                                              // 88
    }                                                                                                                  // 93
                                                                                                                       //
    var index = 0;                                                                                                     // 95
                                                                                                                       //
    var objects = this._getRawObjects({                                                                                // 96
      ordered: true                                                                                                    // 96
    });                                                                                                                // 96
                                                                                                                       //
    return {                                                                                                           // 98
      next: function () {                                                                                              // 99
        if (index < objects.length) {                                                                                  // 100
          // This doubles as a clone operation.                                                                        // 101
          var element = _this._projectionFn(objects[index++]);                                                         // 102
                                                                                                                       //
          if (_this._transform) element = _this._transform(element);                                                   // 104
          return {                                                                                                     // 107
            value: element                                                                                             // 107
          };                                                                                                           // 107
        }                                                                                                              // 108
                                                                                                                       //
        return {                                                                                                       // 110
          done: true                                                                                                   // 110
        };                                                                                                             // 110
      }                                                                                                                // 111
    };                                                                                                                 // 98
  }; /**                                                                                                               // 113
      * @callback IterationCallback                                                                                    //
      * @param {Object} doc                                                                                            //
      * @param {Number} index                                                                                          //
      */ /**                                                                                                           //
          * @summary Call `callback` once for each matching document, sequentially and                                 //
          *          synchronously.                                                                                    //
          * @locus Anywhere                                                                                            //
          * @method  forEach                                                                                           //
          * @instance                                                                                                  //
          * @memberOf Mongo.Cursor                                                                                     //
          * @param {IterationCallback} callback Function to call. It will be called                                    //
          *                                     with three arguments: the document, a                                  //
          *                                     0-based index, and <em>cursor</em>                                     //
          *                                     itself.                                                                //
          * @param {Any} [thisArg] An object which will be the value of `this` inside                                  //
          *                        `callback`.                                                                         //
          */                                                                                                           //
                                                                                                                       //
  Cursor.prototype.forEach = function () {                                                                             //
    function forEach(callback, thisArg) {                                                                              //
      var _this2 = this;                                                                                               // 134
                                                                                                                       //
      if (this.reactive) {                                                                                             // 135
        this._depend({                                                                                                 // 136
          addedBefore: true,                                                                                           // 137
          removed: true,                                                                                               // 138
          changed: true,                                                                                               // 139
          movedBefore: true                                                                                            // 140
        });                                                                                                            // 136
      }                                                                                                                // 141
                                                                                                                       //
      this._getRawObjects({                                                                                            // 143
        ordered: true                                                                                                  // 143
      }).forEach(function (element, i) {                                                                               // 143
        // This doubles as a clone operation.                                                                          // 144
        element = _this2._projectionFn(element);                                                                       // 145
                                                                                                                       //
        if (_this2._transform) {                                                                                       // 147
          element = _this2._transform(element);                                                                        // 148
        }                                                                                                              // 149
                                                                                                                       //
        callback.call(thisArg, element, i, _this2);                                                                    // 151
      });                                                                                                              // 152
    }                                                                                                                  // 153
                                                                                                                       //
    return forEach;                                                                                                    //
  }();                                                                                                                 //
                                                                                                                       //
  Cursor.prototype.getTransform = function () {                                                                        //
    function getTransform() {                                                                                          //
      return this._transform;                                                                                          // 156
    }                                                                                                                  // 157
                                                                                                                       //
    return getTransform;                                                                                               //
  }(); /**                                                                                                             //
        * @summary Map callback over all matching documents.  Returns an Array.                                        //
        * @locus Anywhere                                                                                              //
        * @method map                                                                                                  //
        * @instance                                                                                                    //
        * @memberOf Mongo.Cursor                                                                                       //
        * @param {IterationCallback} callback Function to call. It will be called                                      //
        *                                     with three arguments: the document, a                                    //
        *                                     0-based index, and <em>cursor</em>                                       //
        *                                     itself.                                                                  //
        * @param {Any} [thisArg] An object which will be the value of `this` inside                                    //
        *                        `callback`.                                                                           //
        */                                                                                                             //
                                                                                                                       //
  Cursor.prototype.map = function () {                                                                                 //
    function map(callback, thisArg) {                                                                                  //
      var _this3 = this;                                                                                               // 172
                                                                                                                       //
      var result = [];                                                                                                 // 173
      this.forEach(function (doc, i) {                                                                                 // 175
        result.push(callback.call(thisArg, doc, i, _this3));                                                           // 176
      });                                                                                                              // 177
      return result;                                                                                                   // 179
    }                                                                                                                  // 180
                                                                                                                       //
    return map;                                                                                                        //
  }(); // options to contain:                                                                                          //
  //  * callbacks for observe():                                                                                       // 183
  //    - addedAt (document, atIndex)                                                                                  // 184
  //    - added (document)                                                                                             // 185
  //    - changedAt (newDocument, oldDocument, atIndex)                                                                // 186
  //    - changed (newDocument, oldDocument)                                                                           // 187
  //    - removedAt (document, atIndex)                                                                                // 188
  //    - removed (document)                                                                                           // 189
  //    - movedTo (document, oldIndex, newIndex)                                                                       // 190
  //                                                                                                                   // 191
  // attributes available on returned query handle:                                                                    // 192
  //  * stop(): end updates                                                                                            // 193
  //  * collection: the collection this query is querying                                                              // 194
  //                                                                                                                   // 195
  // iff x is a returned query handle, (x instanceof                                                                   // 196
  // LocalCollection.ObserveHandle) is true                                                                            // 197
  //                                                                                                                   // 198
  // initial results delivered through added callback                                                                  // 199
  // XXX maybe callbacks should take a list of objects, to expose transactions?                                        // 200
  // XXX maybe support field limiting (to limit what you're notified on)                                               // 201
  /**                                                                                                                  // 203
   * @summary Watch a query.  Receive callbacks as the result set changes.                                             //
   * @locus Anywhere                                                                                                   //
   * @memberOf Mongo.Cursor                                                                                            //
   * @instance                                                                                                         //
   * @param {Object} callbacks Functions to call to deliver the result set as it                                       //
   *                           changes                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  Cursor.prototype.observe = function () {                                                                             //
    function observe(options) {                                                                                        //
      return LocalCollection._observeFromObserveChanges(this, options);                                                // 212
    }                                                                                                                  // 213
                                                                                                                       //
    return observe;                                                                                                    //
  }(); /**                                                                                                             //
        * @summary Watch a query. Receive callbacks as the result set changes. Only                                    //
        *          the differences between the old and new documents are passed to                                     //
        *          the callbacks.                                                                                      //
        * @locus Anywhere                                                                                              //
        * @memberOf Mongo.Cursor                                                                                       //
        * @instance                                                                                                    //
        * @param {Object} callbacks Functions to call to deliver the result set as it                                  //
        *                           changes                                                                            //
        */                                                                                                             //
                                                                                                                       //
  Cursor.prototype.observeChanges = function () {                                                                      //
    function observeChanges(options) {                                                                                 //
      var _this4 = this;                                                                                               // 225
                                                                                                                       //
      var ordered = LocalCollection._observeChangesCallbacksAreOrdered(options); // there are several places that assume you aren't combining skip/limit with
      // unordered observe.  eg, update's EJSON.clone, and the "there are several"                                     // 229
      // comment in _modifyAndNotify                                                                                   // 230
      // XXX allow skip/limit with unordered observe                                                                   // 231
                                                                                                                       //
                                                                                                                       //
      if (!options._allow_unordered && !ordered && (this.skip || this.limit)) {                                        // 232
        throw new Error("Must use an ordered observe with skip or limit (i.e. 'addedBefore' " + "for observeChanges or 'addedAt' for observe, instead of 'added').");
      }                                                                                                                // 237
                                                                                                                       //
      if (this.fields && (this.fields._id === 0 || this.fields._id === false)) {                                       // 239
        throw Error('You may not observe a cursor with {fields: {_id: 0}}');                                           // 240
      }                                                                                                                // 241
                                                                                                                       //
      var distances = this.matcher.hasGeoQuery() && ordered && new LocalCollection._IdMap();                           // 243
      var query = {                                                                                                    // 249
        cursor: this,                                                                                                  // 250
        dirty: false,                                                                                                  // 251
        distances: distances,                                                                                          // 252
        matcher: this.matcher,                                                                                         // 253
        // not fast pathed                                                                                             // 253
        ordered: ordered,                                                                                              // 254
        projectionFn: this._projectionFn,                                                                              // 255
        resultsSnapshot: null,                                                                                         // 256
        sorter: ordered && this.sorter                                                                                 // 257
      };                                                                                                               // 249
      var qid = void 0; // Non-reactive queries call added[Before] and then never call anything                        // 260
      // else.                                                                                                         // 263
                                                                                                                       //
      if (this.reactive) {                                                                                             // 264
        qid = this.collection.next_qid++;                                                                              // 265
        this.collection.queries[qid] = query;                                                                          // 266
      }                                                                                                                // 267
                                                                                                                       //
      query.results = this._getRawObjects({                                                                            // 269
        ordered: ordered,                                                                                              // 269
        distances: query.distances                                                                                     // 269
      });                                                                                                              // 269
                                                                                                                       //
      if (this.collection.paused) {                                                                                    // 271
        query.resultsSnapshot = ordered ? [] : new LocalCollection._IdMap();                                           // 272
      } // wrap callbacks we were passed. callbacks only fire when not paused and                                      // 273
      // are never undefined                                                                                           // 276
      // Filters out blacklisted fields according to cursor's projection.                                              // 277
      // XXX wrong place for this?                                                                                     // 278
      // furthermore, callbacks enqueue until the operation we're working on is                                        // 280
      // done.                                                                                                         // 281
                                                                                                                       //
                                                                                                                       //
      var wrapCallback = function (fn) {                                                                               // 282
        if (!fn) {                                                                                                     // 283
          return function () {};                                                                                       // 284
        }                                                                                                              // 285
                                                                                                                       //
        var self = _this4;                                                                                             // 287
        return function () /* args*/{                                                                                  // 288
          var _this5 = this;                                                                                           // 288
                                                                                                                       //
          if (self.collection.paused) {                                                                                // 289
            return;                                                                                                    // 290
          }                                                                                                            // 291
                                                                                                                       //
          var args = arguments;                                                                                        // 293
                                                                                                                       //
          self.collection._observeQueue.queueTask(function () {                                                        // 295
            fn.apply(_this5, args);                                                                                    // 296
          });                                                                                                          // 297
        };                                                                                                             // 298
      };                                                                                                               // 299
                                                                                                                       //
      query.added = wrapCallback(options.added);                                                                       // 301
      query.changed = wrapCallback(options.changed);                                                                   // 302
      query.removed = wrapCallback(options.removed);                                                                   // 303
                                                                                                                       //
      if (ordered) {                                                                                                   // 305
        query.addedBefore = wrapCallback(options.addedBefore);                                                         // 306
        query.movedBefore = wrapCallback(options.movedBefore);                                                         // 307
      }                                                                                                                // 308
                                                                                                                       //
      if (!options._suppress_initial && !this.collection.paused) {                                                     // 310
        var results = ordered ? query.results : query.results._map;                                                    // 311
        Object.keys(results).forEach(function (key) {                                                                  // 313
          var doc = results[key];                                                                                      // 314
          var fields = EJSON.clone(doc);                                                                               // 315
          delete fields._id;                                                                                           // 317
                                                                                                                       //
          if (ordered) {                                                                                               // 319
            query.addedBefore(doc._id, _this4._projectionFn(fields), null);                                            // 320
          }                                                                                                            // 321
                                                                                                                       //
          query.added(doc._id, _this4._projectionFn(fields));                                                          // 323
        });                                                                                                            // 324
      }                                                                                                                // 325
                                                                                                                       //
      var handle = Object.assign(new LocalCollection.ObserveHandle(), {                                                // 327
        collection: this.collection,                                                                                   // 328
        stop: function () {                                                                                            // 329
          if (_this4.reactive) {                                                                                       // 330
            delete _this4.collection.queries[qid];                                                                     // 331
          }                                                                                                            // 332
        }                                                                                                              // 333
      });                                                                                                              // 327
                                                                                                                       //
      if (this.reactive && Tracker.active) {                                                                           // 336
        // XXX in many cases, the same observe will be recreated when                                                  // 337
        // the current autorun is rerun.  we could save work by                                                        // 338
        // letting it linger across rerun and potentially get                                                          // 339
        // repurposed if the same observe is performed, using logic                                                    // 340
        // similar to that of Meteor.subscribe.                                                                        // 341
        Tracker.onInvalidate(function () {                                                                             // 342
          handle.stop();                                                                                               // 343
        });                                                                                                            // 344
      } // run the observe callbacks resulting from the initial contents                                               // 345
      // before we leave the observe.                                                                                  // 348
                                                                                                                       //
                                                                                                                       //
      this.collection._observeQueue.drain();                                                                           // 349
                                                                                                                       //
      return handle;                                                                                                   // 351
    }                                                                                                                  // 352
                                                                                                                       //
    return observeChanges;                                                                                             //
  }(); // Since we don't actually have a "nextObject" interface, there's really no                                     //
  // reason to have a "rewind" interface.  All it did was make multiple calls                                          // 355
  // to fetch/map/forEach return nothing the second time.                                                              // 356
  // XXX COMPAT WITH 0.8.1                                                                                             // 357
                                                                                                                       //
                                                                                                                       //
  Cursor.prototype.rewind = function () {                                                                              //
    function rewind() {}                                                                                               //
                                                                                                                       //
    return rewind;                                                                                                     //
  }(); // XXX Maybe we need a version of observe that just calls a callback if                                         //
  // anything changed.                                                                                                 // 361
                                                                                                                       //
                                                                                                                       //
  Cursor.prototype._depend = function () {                                                                             //
    function _depend(changers, _allow_unordered) {                                                                     //
      if (Tracker.active) {                                                                                            // 363
        var dependency = new Tracker.Dependency();                                                                     // 364
        var notify = dependency.changed.bind(dependency);                                                              // 365
        dependency.depend();                                                                                           // 367
        var options = {                                                                                                // 369
          _allow_unordered: _allow_unordered,                                                                          // 369
          _suppress_initial: true                                                                                      // 369
        };                                                                                                             // 369
        ['added', 'addedBefore', 'changed', 'movedBefore', 'removed'].forEach(function (fn) {                          // 371
          if (changers[fn]) {                                                                                          // 373
            options[fn] = notify;                                                                                      // 374
          }                                                                                                            // 375
        }); // observeChanges will stop() when this computation is invalidated                                         // 376
                                                                                                                       //
        this.observeChanges(options);                                                                                  // 379
      }                                                                                                                // 380
    }                                                                                                                  // 381
                                                                                                                       //
    return _depend;                                                                                                    //
  }();                                                                                                                 //
                                                                                                                       //
  Cursor.prototype._getCollectionName = function () {                                                                  //
    function _getCollectionName() {                                                                                    //
      return this.collection.name;                                                                                     // 384
    }                                                                                                                  // 385
                                                                                                                       //
    return _getCollectionName;                                                                                         //
  }(); // Returns a collection of matching objects, but doesn't deep copy them.                                        //
  //                                                                                                                   // 388
  // If ordered is set, returns a sorted array, respecting sorter, skip, and                                           // 389
  // limit properties of the query provided that options.applySkipLimit is                                             // 390
  // not set to false (#1201). If sorter is falsey, no sort -- you get the                                             // 391
  // natural order.                                                                                                    // 392
  //                                                                                                                   // 393
  // If ordered is not set, returns an object mapping from ID to doc (sorter,                                          // 394
  // skip and limit should not be set).                                                                                // 395
  //                                                                                                                   // 396
  // If ordered is set and this cursor is a $near geoquery, then this function                                         // 397
  // will use an _IdMap to track each distance from the $near argument point in                                        // 398
  // order to use it as a sort key. If an _IdMap is passed in the 'distances'                                          // 399
  // argument, this function will clear it and use it for this purpose                                                 // 400
  // (otherwise it will just create its own _IdMap). The observeChanges                                                // 401
  // implementation uses this to remember the distances after this function                                            // 402
  // returns.                                                                                                          // 403
                                                                                                                       //
                                                                                                                       //
  Cursor.prototype._getRawObjects = function () {                                                                      //
    function _getRawObjects() {                                                                                        //
      var _this6 = this;                                                                                               // 404
                                                                                                                       //
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};                            // 404
      // By default this method will respect skip and limit because .fetch(),                                          // 405
      // .forEach() etc... expect this behaviour. It can be forced to ignore                                           // 406
      // skip and limit by setting applySkipLimit to false (.count() does this,                                        // 407
      // for example)                                                                                                  // 408
      var applySkipLimit = options.applySkipLimit !== false; // XXX use OrderedDict instead of array, and make IdMap and OrderedDict
      // compatible                                                                                                    // 412
                                                                                                                       //
      var results = options.ordered ? [] : new LocalCollection._IdMap(); // fast path for single ID value              // 413
                                                                                                                       //
      if (this._selectorId !== undefined) {                                                                            // 416
        // If you have non-zero skip and ask for a single id, you get nothing.                                         // 417
        // This is so it matches the behavior of the '{_id: foo}' path.                                                // 418
        if (applySkipLimit && this.skip) {                                                                             // 419
          return results;                                                                                              // 420
        }                                                                                                              // 421
                                                                                                                       //
        var selectedDoc = this.collection._docs.get(this._selectorId);                                                 // 423
                                                                                                                       //
        if (selectedDoc) {                                                                                             // 425
          if (options.ordered) {                                                                                       // 426
            results.push(selectedDoc);                                                                                 // 427
          } else {                                                                                                     // 428
            results.set(this._selectorId, selectedDoc);                                                                // 429
          }                                                                                                            // 430
        }                                                                                                              // 431
                                                                                                                       //
        return results;                                                                                                // 433
      } // slow path for arbitrary selector, sort, skip, limit                                                         // 434
      // in the observeChanges case, distances is actually part of the "query"                                         // 438
      // (ie, live results set) object.  in other cases, distances is only used                                        // 439
      // inside this function.                                                                                         // 440
                                                                                                                       //
                                                                                                                       //
      var distances = void 0;                                                                                          // 441
                                                                                                                       //
      if (this.matcher.hasGeoQuery() && options.ordered) {                                                             // 442
        if (options.distances) {                                                                                       // 443
          distances = options.distances;                                                                               // 444
          distances.clear();                                                                                           // 445
        } else {                                                                                                       // 446
          distances = new LocalCollection._IdMap();                                                                    // 447
        }                                                                                                              // 448
      }                                                                                                                // 449
                                                                                                                       //
      this.collection._docs.forEach(function (doc, id) {                                                               // 451
        var matchResult = _this6.matcher.documentMatches(doc);                                                         // 452
                                                                                                                       //
        if (matchResult.result) {                                                                                      // 454
          if (options.ordered) {                                                                                       // 455
            results.push(doc);                                                                                         // 456
                                                                                                                       //
            if (distances && matchResult.distance !== undefined) {                                                     // 458
              distances.set(id, matchResult.distance);                                                                 // 459
            }                                                                                                          // 460
          } else {                                                                                                     // 461
            results.set(id, doc);                                                                                      // 462
          }                                                                                                            // 463
        } // Override to ensure all docs are matched if ignoring skip & limit                                          // 464
                                                                                                                       //
                                                                                                                       //
        if (!applySkipLimit) {                                                                                         // 467
          return true;                                                                                                 // 468
        } // Fast path for limited unsorted queries.                                                                   // 469
        // XXX 'length' check here seems wrong for ordered                                                             // 472
                                                                                                                       //
                                                                                                                       //
        return !_this6.limit || _this6.skip || _this6.sorter || results.length !== _this6.limit;                       // 473
      });                                                                                                              // 479
                                                                                                                       //
      if (!options.ordered) {                                                                                          // 481
        return results;                                                                                                // 482
      }                                                                                                                // 483
                                                                                                                       //
      if (this.sorter) {                                                                                               // 485
        results.sort(this.sorter.getComparator({                                                                       // 486
          distances: distances                                                                                         // 486
        }));                                                                                                           // 486
      } // Return the full set of results if there is no skip or limit or if we're                                     // 487
      // ignoring them                                                                                                 // 490
                                                                                                                       //
                                                                                                                       //
      if (!applySkipLimit || !this.limit && !this.skip) {                                                              // 491
        return results;                                                                                                // 492
      }                                                                                                                // 493
                                                                                                                       //
      return results.slice(this.skip, this.limit ? this.limit + this.skip : results.length);                           // 495
    }                                                                                                                  // 499
                                                                                                                       //
    return _getRawObjects;                                                                                             //
  }();                                                                                                                 //
                                                                                                                       //
  Cursor.prototype._publishCursor = function () {                                                                      //
    function _publishCursor(subscription) {                                                                            //
      // XXX minimongo should not depend on mongo-livedata!                                                            // 502
      if (!Package.mongo) {                                                                                            // 503
        throw new Error('Can\'t publish from Minimongo without the `mongo` package.');                                 // 504
      }                                                                                                                // 507
                                                                                                                       //
      if (!this.collection.name) {                                                                                     // 509
        throw new Error('Can\'t publish a cursor from a collection without a name.');                                  // 510
      }                                                                                                                // 513
                                                                                                                       //
      return Package.mongo.Mongo.Collection._publishCursor(this, subscription, this.collection.name);                  // 515
    }                                                                                                                  // 520
                                                                                                                       //
    return _publishCursor;                                                                                             //
  }();                                                                                                                 //
                                                                                                                       //
  return Cursor;                                                                                                       //
}();                                                                                                                   //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/local_collection.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _toConsumableArray2 = require("babel-runtime/helpers/toConsumableArray");                                          //
                                                                                                                       //
var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);                                                 //
                                                                                                                       //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                                //
                                                                                                                       //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                       //
                                                                                                                       //
var _possibleConstructorReturn2 = require("babel-runtime/helpers/possibleConstructorReturn");                          //
                                                                                                                       //
var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);                                 //
                                                                                                                       //
var _inherits2 = require("babel-runtime/helpers/inherits");                                                            //
                                                                                                                       //
var _inherits3 = _interopRequireDefault(_inherits2);                                                                   //
                                                                                                                       //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                                //
                                                                                                                       //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  "default": function () {                                                                                             // 1
    return LocalCollection;                                                                                            // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
var Cursor = void 0;                                                                                                   // 1
module.watch(require("./cursor.js"), {                                                                                 // 1
  "default": function (v) {                                                                                            // 1
    Cursor = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var ObserveHandle = void 0;                                                                                            // 1
module.watch(require("./observe_handle.js"), {                                                                         // 1
  "default": function (v) {                                                                                            // 1
    ObserveHandle = v;                                                                                                 // 1
  }                                                                                                                    // 1
}, 1);                                                                                                                 // 1
var hasOwn = void 0,                                                                                                   // 1
    isIndexable = void 0,                                                                                              // 1
    isNumericKey = void 0,                                                                                             // 1
    isOperatorObject = void 0,                                                                                         // 1
    populateDocumentWithQueryFields = void 0,                                                                          // 1
    projectionDetails = void 0;                                                                                        // 1
module.watch(require("./common.js"), {                                                                                 // 1
  hasOwn: function (v) {                                                                                               // 1
    hasOwn = v;                                                                                                        // 1
  },                                                                                                                   // 1
  isIndexable: function (v) {                                                                                          // 1
    isIndexable = v;                                                                                                   // 1
  },                                                                                                                   // 1
  isNumericKey: function (v) {                                                                                         // 1
    isNumericKey = v;                                                                                                  // 1
  },                                                                                                                   // 1
  isOperatorObject: function (v) {                                                                                     // 1
    isOperatorObject = v;                                                                                              // 1
  },                                                                                                                   // 1
  populateDocumentWithQueryFields: function (v) {                                                                      // 1
    populateDocumentWithQueryFields = v;                                                                               // 1
  },                                                                                                                   // 1
  projectionDetails: function (v) {                                                                                    // 1
    projectionDetails = v;                                                                                             // 1
  }                                                                                                                    // 1
}, 2);                                                                                                                 // 1
                                                                                                                       //
var LocalCollection = function () {                                                                                    //
  function LocalCollection(name) {                                                                                     // 16
    (0, _classCallCheck3.default)(this, LocalCollection);                                                              // 16
    this.name = name; // _id -> document (also containing id)                                                          // 17
                                                                                                                       //
    this._docs = new LocalCollection._IdMap();                                                                         // 19
    this._observeQueue = new Meteor._SynchronousQueue();                                                               // 21
    this.next_qid = 1; // live query id generator                                                                      // 23
    // qid -> live query object. keys:                                                                                 // 25
    //  ordered: bool. ordered queries have addedBefore/movedBefore callbacks.                                         // 26
    //  results: array (ordered) or object (unordered) of current results                                              // 27
    //    (aliased with this._docs!)                                                                                   // 28
    //  resultsSnapshot: snapshot of results. null if not paused.                                                      // 29
    //  cursor: Cursor object for the query.                                                                           // 30
    //  selector, sorter, (callbacks): functions                                                                       // 31
                                                                                                                       //
    this.queries = Object.create(null); // null if not saving originals; an IdMap from id to original document value   // 32
    // if saving originals. See comments before saveOriginals().                                                       // 35
                                                                                                                       //
    this._savedOriginals = null; // True when observers are paused and we should not send callbacks.                   // 36
                                                                                                                       //
    this.paused = false;                                                                                               // 39
  } // options may include sort, skip, limit, reactive                                                                 // 40
  // sort may be any of these forms:                                                                                   // 43
  //     {a: 1, b: -1}                                                                                                 // 44
  //     [["a", "asc"], ["b", "desc"]]                                                                                 // 45
  //     ["a", ["b", "desc"]]                                                                                          // 46
  //   (in the first form you're beholden to key enumeration order in                                                  // 47
  //   your javascript VM)                                                                                             // 48
  //                                                                                                                   // 49
  // reactive: if given, and false, don't register with Tracker (default                                               // 50
  // is true)                                                                                                          // 51
  //                                                                                                                   // 52
  // XXX possibly should support retrieving a subset of fields? and                                                    // 53
  // have it be a hint (ignored on the client, when not copying the                                                    // 54
  // doc?)                                                                                                             // 55
  //                                                                                                                   // 56
  // XXX sort does not yet support subkeys ('a.b') .. fix that!                                                        // 57
  // XXX add one more sort form: "key"                                                                                 // 58
  // XXX tests                                                                                                         // 59
                                                                                                                       //
                                                                                                                       //
  LocalCollection.prototype.find = function () {                                                                       //
    function find(selector, options) {                                                                                 //
      // default syntax for everything is to omit the selector argument.                                               // 61
      // but if selector is explicitly passed in as false or undefined, we                                             // 62
      // want a selector that matches nothing.                                                                         // 63
      if (arguments.length === 0) {                                                                                    // 64
        selector = {};                                                                                                 // 65
      }                                                                                                                // 66
                                                                                                                       //
      return new LocalCollection.Cursor(this, selector, options);                                                      // 68
    }                                                                                                                  // 69
                                                                                                                       //
    return find;                                                                                                       //
  }();                                                                                                                 //
                                                                                                                       //
  LocalCollection.prototype.findOne = function () {                                                                    //
    function findOne(selector) {                                                                                       //
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                            // 71
                                                                                                                       //
      if (arguments.length === 0) {                                                                                    // 72
        selector = {};                                                                                                 // 73
      } // NOTE: by setting limit 1 here, we end up using very inefficient                                             // 74
      // code that recomputes the whole query on each update. The upside is                                            // 77
      // that when you reactively depend on a findOne you only get                                                     // 78
      // invalidated when the found object changes, not any object in the                                              // 79
      // collection. Most findOne will be by id, which has a fast path, so                                             // 80
      // this might not be a big deal. In most cases, invalidation causes                                              // 81
      // the called to re-query anyway, so this should be a net performance                                            // 82
      // improvement.                                                                                                  // 83
                                                                                                                       //
                                                                                                                       //
      options.limit = 1;                                                                                               // 84
      return this.find(selector, options).fetch()[0];                                                                  // 86
    }                                                                                                                  // 87
                                                                                                                       //
    return findOne;                                                                                                    //
  }(); // XXX possibly enforce that 'undefined' does not appear (we assume                                             //
  // this in our handling of null and $exists)                                                                         // 90
                                                                                                                       //
                                                                                                                       //
  LocalCollection.prototype.insert = function () {                                                                     //
    function insert(doc, callback) {                                                                                   //
      var _this = this;                                                                                                // 91
                                                                                                                       //
      doc = EJSON.clone(doc);                                                                                          // 92
      assertHasValidFieldNames(doc); // if you really want to use ObjectIDs, set this global.                          // 94
      // Mongo.Collection specifies its own ids and does not use this code.                                            // 97
                                                                                                                       //
      if (!hasOwn.call(doc, '_id')) {                                                                                  // 98
        doc._id = LocalCollection._useOID ? new MongoID.ObjectID() : Random.id();                                      // 99
      }                                                                                                                // 100
                                                                                                                       //
      var id = doc._id;                                                                                                // 102
                                                                                                                       //
      if (this._docs.has(id)) {                                                                                        // 104
        throw MinimongoError("Duplicate _id '" + id + "'");                                                            // 105
      }                                                                                                                // 106
                                                                                                                       //
      this._saveOriginal(id, undefined);                                                                               // 108
                                                                                                                       //
      this._docs.set(id, doc);                                                                                         // 109
                                                                                                                       //
      var queriesToRecompute = []; // trigger live queries that match                                                  // 111
                                                                                                                       //
      Object.keys(this.queries).forEach(function (qid) {                                                               // 114
        var query = _this.queries[qid];                                                                                // 115
                                                                                                                       //
        if (query.dirty) {                                                                                             // 117
          return;                                                                                                      // 118
        }                                                                                                              // 119
                                                                                                                       //
        var matchResult = query.matcher.documentMatches(doc);                                                          // 121
                                                                                                                       //
        if (matchResult.result) {                                                                                      // 123
          if (query.distances && matchResult.distance !== undefined) {                                                 // 124
            query.distances.set(id, matchResult.distance);                                                             // 125
          }                                                                                                            // 126
                                                                                                                       //
          if (query.cursor.skip || query.cursor.limit) {                                                               // 128
            queriesToRecompute.push(qid);                                                                              // 129
          } else {                                                                                                     // 130
            LocalCollection._insertInResults(query, doc);                                                              // 131
          }                                                                                                            // 132
        }                                                                                                              // 133
      });                                                                                                              // 134
      queriesToRecompute.forEach(function (qid) {                                                                      // 136
        if (_this.queries[qid]) {                                                                                      // 137
          _this._recomputeResults(_this.queries[qid]);                                                                 // 138
        }                                                                                                              // 139
      });                                                                                                              // 140
                                                                                                                       //
      this._observeQueue.drain(); // Defer because the caller likely doesn't expect the callback to be run             // 142
      // immediately.                                                                                                  // 145
                                                                                                                       //
                                                                                                                       //
      if (callback) {                                                                                                  // 146
        Meteor.defer(function () {                                                                                     // 147
          callback(null, id);                                                                                          // 148
        });                                                                                                            // 149
      }                                                                                                                // 150
                                                                                                                       //
      return id;                                                                                                       // 152
    }                                                                                                                  // 153
                                                                                                                       //
    return insert;                                                                                                     //
  }(); // Pause the observers. No callbacks from observers will fire until                                             //
  // 'resumeObservers' is called.                                                                                      // 156
                                                                                                                       //
                                                                                                                       //
  LocalCollection.prototype.pauseObservers = function () {                                                             //
    function pauseObservers() {                                                                                        //
      var _this2 = this;                                                                                               // 157
                                                                                                                       //
      // No-op if already paused.                                                                                      // 158
      if (this.paused) {                                                                                               // 159
        return;                                                                                                        // 160
      } // Set the 'paused' flag such that new observer messages don't fire.                                           // 161
                                                                                                                       //
                                                                                                                       //
      this.paused = true; // Take a snapshot of the query results for each query.                                      // 164
                                                                                                                       //
      Object.keys(this.queries).forEach(function (qid) {                                                               // 167
        var query = _this2.queries[qid];                                                                               // 168
        query.resultsSnapshot = EJSON.clone(query.results);                                                            // 169
      });                                                                                                              // 170
    }                                                                                                                  // 171
                                                                                                                       //
    return pauseObservers;                                                                                             //
  }();                                                                                                                 //
                                                                                                                       //
  LocalCollection.prototype.remove = function () {                                                                     //
    function remove(selector, callback) {                                                                              //
      var _this3 = this;                                                                                               // 173
                                                                                                                       //
      // Easy special case: if we're not calling observeChanges callbacks and                                          // 174
      // we're not saving originals and we got asked to remove everything, then                                        // 175
      // just empty everything directly.                                                                               // 176
      if (this.paused && !this._savedOriginals && EJSON.equals(selector, {})) {                                        // 177
        var _result = this._docs.size();                                                                               // 178
                                                                                                                       //
        this._docs.clear();                                                                                            // 180
                                                                                                                       //
        Object.keys(this.queries).forEach(function (qid) {                                                             // 182
          var query = _this3.queries[qid];                                                                             // 183
                                                                                                                       //
          if (query.ordered) {                                                                                         // 185
            query.results = [];                                                                                        // 186
          } else {                                                                                                     // 187
            query.results.clear();                                                                                     // 188
          }                                                                                                            // 189
        });                                                                                                            // 190
                                                                                                                       //
        if (callback) {                                                                                                // 192
          Meteor.defer(function () {                                                                                   // 193
            callback(null, _result);                                                                                   // 194
          });                                                                                                          // 195
        }                                                                                                              // 196
                                                                                                                       //
        return _result;                                                                                                // 198
      }                                                                                                                // 199
                                                                                                                       //
      var matcher = new Minimongo.Matcher(selector);                                                                   // 201
      var remove = [];                                                                                                 // 202
                                                                                                                       //
      this._eachPossiblyMatchingDoc(selector, function (doc, id) {                                                     // 204
        if (matcher.documentMatches(doc).result) {                                                                     // 205
          remove.push(id);                                                                                             // 206
        }                                                                                                              // 207
      });                                                                                                              // 208
                                                                                                                       //
      var queriesToRecompute = [];                                                                                     // 210
      var queryRemove = [];                                                                                            // 211
                                                                                                                       //
      var _loop = function (i) {                                                                                       // 173
        var removeId = remove[i];                                                                                      // 214
                                                                                                                       //
        var removeDoc = _this3._docs.get(removeId);                                                                    // 215
                                                                                                                       //
        Object.keys(_this3.queries).forEach(function (qid) {                                                           // 217
          var query = _this3.queries[qid];                                                                             // 218
                                                                                                                       //
          if (query.dirty) {                                                                                           // 220
            return;                                                                                                    // 221
          }                                                                                                            // 222
                                                                                                                       //
          if (query.matcher.documentMatches(removeDoc).result) {                                                       // 224
            if (query.cursor.skip || query.cursor.limit) {                                                             // 225
              queriesToRecompute.push(qid);                                                                            // 226
            } else {                                                                                                   // 227
              queryRemove.push({                                                                                       // 228
                qid: qid,                                                                                              // 228
                doc: removeDoc                                                                                         // 228
              });                                                                                                      // 228
            }                                                                                                          // 229
          }                                                                                                            // 230
        });                                                                                                            // 231
                                                                                                                       //
        _this3._saveOriginal(removeId, removeDoc);                                                                     // 233
                                                                                                                       //
        _this3._docs.remove(removeId);                                                                                 // 234
      };                                                                                                               // 173
                                                                                                                       //
      for (var i = 0; i < remove.length; i++) {                                                                        // 213
        _loop(i);                                                                                                      // 213
      } // run live query callbacks _after_ we've removed the documents.                                               // 235
                                                                                                                       //
                                                                                                                       //
      queryRemove.forEach(function (remove) {                                                                          // 238
        var query = _this3.queries[remove.qid];                                                                        // 239
                                                                                                                       //
        if (query) {                                                                                                   // 241
          query.distances && query.distances.remove(remove.doc._id);                                                   // 242
                                                                                                                       //
          LocalCollection._removeFromResults(query, remove.doc);                                                       // 243
        }                                                                                                              // 244
      });                                                                                                              // 245
      queriesToRecompute.forEach(function (qid) {                                                                      // 247
        var query = _this3.queries[qid];                                                                               // 248
                                                                                                                       //
        if (query) {                                                                                                   // 250
          _this3._recomputeResults(query);                                                                             // 251
        }                                                                                                              // 252
      });                                                                                                              // 253
                                                                                                                       //
      this._observeQueue.drain();                                                                                      // 255
                                                                                                                       //
      var result = remove.length;                                                                                      // 257
                                                                                                                       //
      if (callback) {                                                                                                  // 259
        Meteor.defer(function () {                                                                                     // 260
          callback(null, result);                                                                                      // 261
        });                                                                                                            // 262
      }                                                                                                                // 263
                                                                                                                       //
      return result;                                                                                                   // 265
    }                                                                                                                  // 266
                                                                                                                       //
    return remove;                                                                                                     //
  }(); // Resume the observers. Observers immediately receive change                                                   //
  // notifications to bring them to the current state of the                                                           // 269
  // database. Note that this is not just replaying all the changes that                                               // 270
  // happened during the pause, it is a smarter 'coalesced' diff.                                                      // 271
                                                                                                                       //
                                                                                                                       //
  LocalCollection.prototype.resumeObservers = function () {                                                            //
    function resumeObservers() {                                                                                       //
      var _this4 = this;                                                                                               // 272
                                                                                                                       //
      // No-op if not paused.                                                                                          // 273
      if (!this.paused) {                                                                                              // 274
        return;                                                                                                        // 275
      } // Unset the 'paused' flag. Make sure to do this first, otherwise                                              // 276
      // observer methods won't actually fire when we trigger them.                                                    // 279
                                                                                                                       //
                                                                                                                       //
      this.paused = false;                                                                                             // 280
      Object.keys(this.queries).forEach(function (qid) {                                                               // 282
        var query = _this4.queries[qid];                                                                               // 283
                                                                                                                       //
        if (query.dirty) {                                                                                             // 285
          query.dirty = false; // re-compute results will perform `LocalCollection._diffQueryChanges`                  // 286
          // automatically.                                                                                            // 289
                                                                                                                       //
          _this4._recomputeResults(query, query.resultsSnapshot);                                                      // 290
        } else {                                                                                                       // 291
          // Diff the current results against the snapshot and send to observers.                                      // 292
          // pass the query object for its observer callbacks.                                                         // 293
          LocalCollection._diffQueryChanges(query.ordered, query.resultsSnapshot, query.results, query, {              // 294
            projectionFn: query.projectionFn                                                                           // 299
          });                                                                                                          // 299
        }                                                                                                              // 301
                                                                                                                       //
        query.resultsSnapshot = null;                                                                                  // 303
      });                                                                                                              // 304
                                                                                                                       //
      this._observeQueue.drain();                                                                                      // 306
    }                                                                                                                  // 307
                                                                                                                       //
    return resumeObservers;                                                                                            //
  }();                                                                                                                 //
                                                                                                                       //
  LocalCollection.prototype.retrieveOriginals = function () {                                                          //
    function retrieveOriginals() {                                                                                     //
      if (!this._savedOriginals) {                                                                                     // 310
        throw new Error('Called retrieveOriginals without saveOriginals');                                             // 311
      }                                                                                                                // 312
                                                                                                                       //
      var originals = this._savedOriginals;                                                                            // 314
      this._savedOriginals = null;                                                                                     // 316
      return originals;                                                                                                // 318
    }                                                                                                                  // 319
                                                                                                                       //
    return retrieveOriginals;                                                                                          //
  }(); // To track what documents are affected by a piece of code, call                                                //
  // saveOriginals() before it and retrieveOriginals() after it.                                                       // 322
  // retrieveOriginals returns an object whose keys are the ids of the documents                                       // 323
  // that were affected since the call to saveOriginals(), and the values are                                          // 324
  // equal to the document's contents at the time of saveOriginals. (In the case                                       // 325
  // of an inserted document, undefined is the value.) You must alternate                                              // 326
  // between calls to saveOriginals() and retrieveOriginals().                                                         // 327
                                                                                                                       //
                                                                                                                       //
  LocalCollection.prototype.saveOriginals = function () {                                                              //
    function saveOriginals() {                                                                                         //
      if (this._savedOriginals) {                                                                                      // 329
        throw new Error('Called saveOriginals twice without retrieveOriginals');                                       // 330
      }                                                                                                                // 331
                                                                                                                       //
      this._savedOriginals = new LocalCollection._IdMap();                                                             // 333
    }                                                                                                                  // 334
                                                                                                                       //
    return saveOriginals;                                                                                              //
  }(); // XXX atomicity: if multi is true, and one modification fails, do                                              //
  // we rollback the whole operation, or what?                                                                         // 337
                                                                                                                       //
                                                                                                                       //
  LocalCollection.prototype.update = function () {                                                                     //
    function update(selector, mod, options, callback) {                                                                //
      var _this5 = this;                                                                                               // 338
                                                                                                                       //
      if (!callback && options instanceof Function) {                                                                  // 339
        callback = options;                                                                                            // 340
        options = null;                                                                                                // 341
      }                                                                                                                // 342
                                                                                                                       //
      if (!options) {                                                                                                  // 344
        options = {};                                                                                                  // 345
      }                                                                                                                // 346
                                                                                                                       //
      var matcher = new Minimongo.Matcher(selector, true); // Save the original results of any query that we might need to
      // _recomputeResults on, because _modifyAndNotify will mutate the objects in                                     // 351
      // it. (We don't need to save the original results of paused queries because                                     // 352
      // they already have a resultsSnapshot and we won't be diffing in                                                // 353
      // _recomputeResults.)                                                                                           // 354
                                                                                                                       //
      var qidToOriginalResults = {}; // We should only clone each document once, even if it appears in multiple        // 355
      // queries                                                                                                       // 358
                                                                                                                       //
      var docMap = new LocalCollection._IdMap();                                                                       // 359
                                                                                                                       //
      var idsMatched = LocalCollection._idsMatchedBySelector(selector);                                                // 360
                                                                                                                       //
      Object.keys(this.queries).forEach(function (qid) {                                                               // 362
        var query = _this5.queries[qid];                                                                               // 363
                                                                                                                       //
        if ((query.cursor.skip || query.cursor.limit) && !_this5.paused) {                                             // 365
          // Catch the case of a reactive `count()` on a cursor with skip                                              // 366
          // or limit, which registers an unordered observe. This is a                                                 // 367
          // pretty rare case, so we just clone the entire result set with                                             // 368
          // no optimizations for documents that appear in these result                                                // 369
          // sets and other queries.                                                                                   // 370
          if (query.results instanceof LocalCollection._IdMap) {                                                       // 371
            qidToOriginalResults[qid] = query.results.clone();                                                         // 372
            return;                                                                                                    // 373
          }                                                                                                            // 374
                                                                                                                       //
          if (!(query.results instanceof Array)) {                                                                     // 376
            throw new Error('Assertion failed: query.results not an array');                                           // 377
          } // Clones a document to be stored in `qidToOriginalResults`                                                // 378
          // because it may be modified before the new and old result sets                                             // 381
          // are diffed. But if we know exactly which document IDs we're                                               // 382
          // going to modify, then we only need to clone those.                                                        // 383
                                                                                                                       //
                                                                                                                       //
          var memoizedCloneIfNeeded = function (doc) {                                                                 // 384
            if (docMap.has(doc._id)) {                                                                                 // 385
              return docMap.get(doc._id);                                                                              // 386
            }                                                                                                          // 387
                                                                                                                       //
            var docToMemoize = idsMatched && !idsMatched.some(function (id) {                                          // 389
              return EJSON.equals(id, doc._id);                                                                        // 391
            }) ? doc : EJSON.clone(doc);                                                                               // 391
            docMap.set(doc._id, docToMemoize);                                                                         // 394
            return docToMemoize;                                                                                       // 396
          };                                                                                                           // 397
                                                                                                                       //
          qidToOriginalResults[qid] = query.results.map(memoizedCloneIfNeeded);                                        // 399
        }                                                                                                              // 400
      });                                                                                                              // 401
      var recomputeQids = {};                                                                                          // 403
      var updateCount = 0;                                                                                             // 405
                                                                                                                       //
      this._eachPossiblyMatchingDoc(selector, function (doc, id) {                                                     // 407
        var queryResult = matcher.documentMatches(doc);                                                                // 408
                                                                                                                       //
        if (queryResult.result) {                                                                                      // 410
          // XXX Should we save the original even if mod ends up being a no-op?                                        // 411
          _this5._saveOriginal(id, doc);                                                                               // 412
                                                                                                                       //
          _this5._modifyAndNotify(doc, mod, recomputeQids, queryResult.arrayIndices);                                  // 413
                                                                                                                       //
          ++updateCount;                                                                                               // 420
                                                                                                                       //
          if (!options.multi) {                                                                                        // 422
            return false; // break                                                                                     // 423
          }                                                                                                            // 424
        }                                                                                                              // 425
                                                                                                                       //
        return true;                                                                                                   // 427
      });                                                                                                              // 428
                                                                                                                       //
      Object.keys(recomputeQids).forEach(function (qid) {                                                              // 430
        var query = _this5.queries[qid];                                                                               // 431
                                                                                                                       //
        if (query) {                                                                                                   // 433
          _this5._recomputeResults(query, qidToOriginalResults[qid]);                                                  // 434
        }                                                                                                              // 435
      });                                                                                                              // 436
                                                                                                                       //
      this._observeQueue.drain(); // If we are doing an upsert, and we didn't modify any documents yet, then           // 438
      // it's time to do an insert. Figure out what document we are inserting, and                                     // 441
      // generate an id for it.                                                                                        // 442
                                                                                                                       //
                                                                                                                       //
      var insertedId = void 0;                                                                                         // 443
                                                                                                                       //
      if (updateCount === 0 && options.upsert) {                                                                       // 444
        var doc = LocalCollection._createUpsertDocument(selector, mod);                                                // 445
                                                                                                                       //
        if (!doc._id && options.insertedId) {                                                                          // 446
          doc._id = options.insertedId;                                                                                // 447
        }                                                                                                              // 448
                                                                                                                       //
        insertedId = this.insert(doc);                                                                                 // 450
        updateCount = 1;                                                                                               // 451
      } // Return the number of affected documents, or in the upsert case, an object                                   // 452
      // containing the number of affected docs and the id of the doc that was                                         // 455
      // inserted, if any.                                                                                             // 456
                                                                                                                       //
                                                                                                                       //
      var result = void 0;                                                                                             // 457
                                                                                                                       //
      if (options._returnObject) {                                                                                     // 458
        result = {                                                                                                     // 459
          numberAffected: updateCount                                                                                  // 459
        };                                                                                                             // 459
                                                                                                                       //
        if (insertedId !== undefined) {                                                                                // 461
          result.insertedId = insertedId;                                                                              // 462
        }                                                                                                              // 463
      } else {                                                                                                         // 464
        result = updateCount;                                                                                          // 465
      }                                                                                                                // 466
                                                                                                                       //
      if (callback) {                                                                                                  // 468
        Meteor.defer(function () {                                                                                     // 469
          callback(null, result);                                                                                      // 470
        });                                                                                                            // 471
      }                                                                                                                // 472
                                                                                                                       //
      return result;                                                                                                   // 474
    }                                                                                                                  // 475
                                                                                                                       //
    return update;                                                                                                     //
  }(); // A convenience wrapper on update. LocalCollection.upsert(sel, mod) is                                         //
  // equivalent to LocalCollection.update(sel, mod, {upsert: true,                                                     // 478
  // _returnObject: true}).                                                                                            // 479
                                                                                                                       //
                                                                                                                       //
  LocalCollection.prototype.upsert = function () {                                                                     //
    function upsert(selector, mod, options, callback) {                                                                //
      if (!callback && typeof options === 'function') {                                                                // 481
        callback = options;                                                                                            // 482
        options = {};                                                                                                  // 483
      }                                                                                                                // 484
                                                                                                                       //
      return this.update(selector, mod, Object.assign({}, options, {                                                   // 486
        upsert: true,                                                                                                  // 489
        _returnObject: true                                                                                            // 489
      }), callback);                                                                                                   // 489
    }                                                                                                                  // 492
                                                                                                                       //
    return upsert;                                                                                                     //
  }(); // Iterates over a subset of documents that could match selector; calls                                         //
  // fn(doc, id) on each of them.  Specifically, if selector specifies                                                 // 495
  // specific _id's, it only looks at those.  doc is *not* cloned: it is the                                           // 496
  // same object that is in _docs.                                                                                     // 497
                                                                                                                       //
                                                                                                                       //
  LocalCollection.prototype._eachPossiblyMatchingDoc = function () {                                                   //
    function _eachPossiblyMatchingDoc(selector, fn) {                                                                  //
      var _this6 = this;                                                                                               // 498
                                                                                                                       //
      var specificIds = LocalCollection._idsMatchedBySelector(selector);                                               // 499
                                                                                                                       //
      if (specificIds) {                                                                                               // 501
        specificIds.some(function (id) {                                                                               // 502
          var doc = _this6._docs.get(id);                                                                              // 503
                                                                                                                       //
          if (doc) {                                                                                                   // 505
            return fn(doc, id) === false;                                                                              // 506
          }                                                                                                            // 507
        });                                                                                                            // 508
      } else {                                                                                                         // 509
        this._docs.forEach(fn);                                                                                        // 510
      }                                                                                                                // 511
    }                                                                                                                  // 512
                                                                                                                       //
    return _eachPossiblyMatchingDoc;                                                                                   //
  }();                                                                                                                 //
                                                                                                                       //
  LocalCollection.prototype._modifyAndNotify = function () {                                                           //
    function _modifyAndNotify(doc, mod, recomputeQids, arrayIndices) {                                                 //
      var _this7 = this;                                                                                               // 514
                                                                                                                       //
      var matched_before = {};                                                                                         // 515
      Object.keys(this.queries).forEach(function (qid) {                                                               // 517
        var query = _this7.queries[qid];                                                                               // 518
                                                                                                                       //
        if (query.dirty) {                                                                                             // 520
          return;                                                                                                      // 521
        }                                                                                                              // 522
                                                                                                                       //
        if (query.ordered) {                                                                                           // 524
          matched_before[qid] = query.matcher.documentMatches(doc).result;                                             // 525
        } else {                                                                                                       // 526
          // Because we don't support skip or limit (yet) in unordered queries, we                                     // 527
          // can just do a direct lookup.                                                                              // 528
          matched_before[qid] = query.results.has(doc._id);                                                            // 529
        }                                                                                                              // 530
      });                                                                                                              // 531
      var old_doc = EJSON.clone(doc);                                                                                  // 533
                                                                                                                       //
      LocalCollection._modify(doc, mod, {                                                                              // 535
        arrayIndices: arrayIndices                                                                                     // 535
      });                                                                                                              // 535
                                                                                                                       //
      Object.keys(this.queries).forEach(function (qid) {                                                               // 537
        var query = _this7.queries[qid];                                                                               // 538
                                                                                                                       //
        if (query.dirty) {                                                                                             // 540
          return;                                                                                                      // 541
        }                                                                                                              // 542
                                                                                                                       //
        var afterMatch = query.matcher.documentMatches(doc);                                                           // 544
        var after = afterMatch.result;                                                                                 // 545
        var before = matched_before[qid];                                                                              // 546
                                                                                                                       //
        if (after && query.distances && afterMatch.distance !== undefined) {                                           // 548
          query.distances.set(doc._id, afterMatch.distance);                                                           // 549
        }                                                                                                              // 550
                                                                                                                       //
        if (query.cursor.skip || query.cursor.limit) {                                                                 // 552
          // We need to recompute any query where the doc may have been in the                                         // 553
          // cursor's window either before or after the update. (Note that if skip                                     // 554
          // or limit is set, "before" and "after" being true do not necessarily                                       // 555
          // mean that the document is in the cursor's output after skip/limit is                                      // 556
          // applied... but if they are false, then the document definitely is NOT                                     // 557
          // in the output. So it's safe to skip recompute if neither before or                                        // 558
          // after are true.)                                                                                          // 559
          if (before || after) {                                                                                       // 560
            recomputeQids[qid] = true;                                                                                 // 561
          }                                                                                                            // 562
        } else if (before && !after) {                                                                                 // 563
          LocalCollection._removeFromResults(query, doc);                                                              // 564
        } else if (!before && after) {                                                                                 // 565
          LocalCollection._insertInResults(query, doc);                                                                // 566
        } else if (before && after) {                                                                                  // 567
          LocalCollection._updateInResults(query, doc, old_doc);                                                       // 568
        }                                                                                                              // 569
      });                                                                                                              // 570
    }                                                                                                                  // 571
                                                                                                                       //
    return _modifyAndNotify;                                                                                           //
  }(); // Recomputes the results of a query and runs observe callbacks for the                                         //
  // difference between the previous results and the current results (unless                                           // 574
  // paused). Used for skip/limit queries.                                                                             // 575
  //                                                                                                                   // 576
  // When this is used by insert or remove, it can just use query.results for                                          // 577
  // the old results (and there's no need to pass in oldResults), because these                                        // 578
  // operations don't mutate the documents in the collection. Update needs to                                          // 579
  // pass in an oldResults which was deep-copied before the modifier was                                               // 580
  // applied.                                                                                                          // 581
  //                                                                                                                   // 582
  // oldResults is guaranteed to be ignored if the query is not paused.                                                // 583
                                                                                                                       //
                                                                                                                       //
  LocalCollection.prototype._recomputeResults = function () {                                                          //
    function _recomputeResults(query, oldResults) {                                                                    //
      if (this.paused) {                                                                                               // 585
        // There's no reason to recompute the results now as we're still paused.                                       // 586
        // By flagging the query as "dirty", the recompute will be performed                                           // 587
        // when resumeObservers is called.                                                                             // 588
        query.dirty = true;                                                                                            // 589
        return;                                                                                                        // 590
      }                                                                                                                // 591
                                                                                                                       //
      if (!this.paused && !oldResults) {                                                                               // 593
        oldResults = query.results;                                                                                    // 594
      }                                                                                                                // 595
                                                                                                                       //
      if (query.distances) {                                                                                           // 597
        query.distances.clear();                                                                                       // 598
      }                                                                                                                // 599
                                                                                                                       //
      query.results = query.cursor._getRawObjects({                                                                    // 601
        distances: query.distances,                                                                                    // 602
        ordered: query.ordered                                                                                         // 603
      });                                                                                                              // 601
                                                                                                                       //
      if (!this.paused) {                                                                                              // 606
        LocalCollection._diffQueryChanges(query.ordered, oldResults, query.results, query, {                           // 607
          projectionFn: query.projectionFn                                                                             // 612
        });                                                                                                            // 612
      }                                                                                                                // 614
    }                                                                                                                  // 615
                                                                                                                       //
    return _recomputeResults;                                                                                          //
  }();                                                                                                                 //
                                                                                                                       //
  LocalCollection.prototype._saveOriginal = function () {                                                              //
    function _saveOriginal(id, doc) {                                                                                  //
      // Are we even trying to save originals?                                                                         // 618
      if (!this._savedOriginals) {                                                                                     // 619
        return;                                                                                                        // 620
      } // Have we previously mutated the original (and so 'doc' is not actually                                       // 621
      // original)?  (Note the 'has' check rather than truth: we store undefined                                       // 624
      // here for inserted docs!)                                                                                      // 625
                                                                                                                       //
                                                                                                                       //
      if (this._savedOriginals.has(id)) {                                                                              // 626
        return;                                                                                                        // 627
      }                                                                                                                // 628
                                                                                                                       //
      this._savedOriginals.set(id, EJSON.clone(doc));                                                                  // 630
    }                                                                                                                  // 631
                                                                                                                       //
    return _saveOriginal;                                                                                              //
  }();                                                                                                                 //
                                                                                                                       //
  return LocalCollection;                                                                                              //
}();                                                                                                                   //
                                                                                                                       //
LocalCollection.Cursor = Cursor;                                                                                       // 634
LocalCollection.ObserveHandle = ObserveHandle; // XXX maybe move these into another ObserveHelpers package or something
// _CachingChangeObserver is an object which receives observeChanges callbacks                                         // 640
// and keeps a cache of the current cursor state up to date in this.docs. Users                                        // 641
// of this class should read the docs field but not modify it. You should pass                                         // 642
// the "applyChange" field as the callbacks to the underlying observeChanges                                           // 643
// call. Optionally, you can specify your own observeChanges callbacks which are                                       // 644
// invoked immediately before the docs field is updated; this object is made                                           // 645
// available as `this` to those callbacks.                                                                             // 646
                                                                                                                       //
LocalCollection._CachingChangeObserver = function () {                                                                 // 647
  function _CachingChangeObserver() {                                                                                  // 648
    var _this8 = this;                                                                                                 // 648
                                                                                                                       //
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};                              // 648
    (0, _classCallCheck3.default)(this, _CachingChangeObserver);                                                       // 648
                                                                                                                       //
    var orderedFromCallbacks = options.callbacks && LocalCollection._observeChangesCallbacksAreOrdered(options.callbacks);
                                                                                                                       //
    if (hasOwn.call(options, 'ordered')) {                                                                             // 654
      this.ordered = options.ordered;                                                                                  // 655
                                                                                                                       //
      if (options.callbacks && options.ordered !== orderedFromCallbacks) {                                             // 657
        throw Error('ordered option doesn\'t match callbacks');                                                        // 658
      }                                                                                                                // 659
    } else if (options.callbacks) {                                                                                    // 660
      this.ordered = orderedFromCallbacks;                                                                             // 661
    } else {                                                                                                           // 662
      throw Error('must provide ordered or callbacks');                                                                // 663
    }                                                                                                                  // 664
                                                                                                                       //
    var callbacks = options.callbacks || {};                                                                           // 666
                                                                                                                       //
    if (this.ordered) {                                                                                                // 668
      this.docs = new OrderedDict(MongoID.idStringify);                                                                // 669
      this.applyChange = {                                                                                             // 670
        addedBefore: function (id, fields, before) {                                                                   // 671
          var doc = EJSON.clone(fields);                                                                               // 672
          doc._id = id;                                                                                                // 674
                                                                                                                       //
          if (callbacks.addedBefore) {                                                                                 // 676
            callbacks.addedBefore.call(_this8, id, fields, before);                                                    // 677
          } // This line triggers if we provide added with movedBefore.                                                // 678
                                                                                                                       //
                                                                                                                       //
          if (callbacks.added) {                                                                                       // 681
            callbacks.added.call(_this8, id, fields);                                                                  // 682
          } // XXX could `before` be a falsy ID?  Technically                                                          // 683
          // idStringify seems to allow for them -- though                                                             // 686
          // OrderedDict won't call stringify on a falsy arg.                                                          // 687
                                                                                                                       //
                                                                                                                       //
          _this8.docs.putBefore(id, doc, before || null);                                                              // 688
        },                                                                                                             // 689
        movedBefore: function (id, before) {                                                                           // 690
          var doc = _this8.docs.get(id);                                                                               // 691
                                                                                                                       //
          if (callbacks.movedBefore) {                                                                                 // 693
            callbacks.movedBefore.call(_this8, id, before);                                                            // 694
          }                                                                                                            // 695
                                                                                                                       //
          _this8.docs.moveBefore(id, before || null);                                                                  // 697
        }                                                                                                              // 698
      };                                                                                                               // 670
    } else {                                                                                                           // 700
      this.docs = new LocalCollection._IdMap();                                                                        // 701
      this.applyChange = {                                                                                             // 702
        added: function (id, fields) {                                                                                 // 703
          var doc = EJSON.clone(fields);                                                                               // 704
                                                                                                                       //
          if (callbacks.added) {                                                                                       // 706
            callbacks.added.call(_this8, id, fields);                                                                  // 707
          }                                                                                                            // 708
                                                                                                                       //
          doc._id = id;                                                                                                // 710
                                                                                                                       //
          _this8.docs.set(id, doc);                                                                                    // 712
        }                                                                                                              // 713
      };                                                                                                               // 702
    } // The methods in _IdMap and OrderedDict used by these callbacks are                                             // 715
    // identical.                                                                                                      // 718
                                                                                                                       //
                                                                                                                       //
    this.applyChange.changed = function (id, fields) {                                                                 // 719
      var doc = _this8.docs.get(id);                                                                                   // 720
                                                                                                                       //
      if (!doc) {                                                                                                      // 722
        throw new Error("Unknown id for changed: " + id);                                                              // 723
      }                                                                                                                // 724
                                                                                                                       //
      if (callbacks.changed) {                                                                                         // 726
        callbacks.changed.call(_this8, id, EJSON.clone(fields));                                                       // 727
      }                                                                                                                // 728
                                                                                                                       //
      DiffSequence.applyChanges(doc, fields);                                                                          // 730
    };                                                                                                                 // 731
                                                                                                                       //
    this.applyChange.removed = function (id) {                                                                         // 733
      if (callbacks.removed) {                                                                                         // 734
        callbacks.removed.call(_this8, id);                                                                            // 735
      }                                                                                                                // 736
                                                                                                                       //
      _this8.docs.remove(id);                                                                                          // 738
    };                                                                                                                 // 739
  }                                                                                                                    // 740
                                                                                                                       //
  return _CachingChangeObserver;                                                                                       // 647
}();                                                                                                                   // 647
                                                                                                                       //
LocalCollection._IdMap = function (_IdMap2) {                                                                          // 743
  (0, _inherits3.default)(_IdMap, _IdMap2);                                                                            // 743
                                                                                                                       //
  function _IdMap() {                                                                                                  // 744
    (0, _classCallCheck3.default)(this, _IdMap);                                                                       // 744
    return (0, _possibleConstructorReturn3.default)(this, _IdMap2.call(this, MongoID.idStringify, MongoID.idParse));   // 744
  }                                                                                                                    // 746
                                                                                                                       //
  return _IdMap;                                                                                                       // 743
}(IdMap); // Wrap a transform function to return objects that have the _id field                                       // 743
// of the untransformed document. This ensures that subsystems such as                                                 // 750
// the observe-sequence package that call `observe` can keep track of                                                  // 751
// the documents identities.                                                                                           // 752
//                                                                                                                     // 753
// - Require that it returns objects                                                                                   // 754
// - If the return value has an _id field, verify that it matches the                                                  // 755
//   original _id field                                                                                                // 756
// - If the return value doesn't have an _id field, add it back.                                                       // 757
                                                                                                                       //
                                                                                                                       //
LocalCollection.wrapTransform = function (transform) {                                                                 // 758
  if (!transform) {                                                                                                    // 759
    return null;                                                                                                       // 760
  } // No need to doubly-wrap transforms.                                                                              // 761
                                                                                                                       //
                                                                                                                       //
  if (transform.__wrappedTransform__) {                                                                                // 764
    return transform;                                                                                                  // 765
  }                                                                                                                    // 766
                                                                                                                       //
  var wrapped = function (doc) {                                                                                       // 768
    if (!hasOwn.call(doc, '_id')) {                                                                                    // 769
      // XXX do we ever have a transform on the oplog's collection? because that                                       // 770
      // collection has no _id.                                                                                        // 771
      throw new Error('can only transform documents with _id');                                                        // 772
    }                                                                                                                  // 773
                                                                                                                       //
    var id = doc._id; // XXX consider making tracker a weak dependency and checking                                    // 775
    // Package.tracker here                                                                                            // 778
                                                                                                                       //
    var transformed = Tracker.nonreactive(function () {                                                                // 779
      return transform(doc);                                                                                           // 779
    });                                                                                                                // 779
                                                                                                                       //
    if (!LocalCollection._isPlainObject(transformed)) {                                                                // 781
      throw new Error('transform must return object');                                                                 // 782
    }                                                                                                                  // 783
                                                                                                                       //
    if (hasOwn.call(transformed, '_id')) {                                                                             // 785
      if (!EJSON.equals(transformed._id, id)) {                                                                        // 786
        throw new Error('transformed document can\'t have different _id');                                             // 787
      }                                                                                                                // 788
    } else {                                                                                                           // 789
      transformed._id = id;                                                                                            // 790
    }                                                                                                                  // 791
                                                                                                                       //
    return transformed;                                                                                                // 793
  };                                                                                                                   // 794
                                                                                                                       //
  wrapped.__wrappedTransform__ = true;                                                                                 // 796
  return wrapped;                                                                                                      // 798
}; // XXX the sorted-query logic below is laughably inefficient. we'll                                                 // 799
// need to come up with a better datastructure for this.                                                               // 802
//                                                                                                                     // 803
// XXX the logic for observing with a skip or a limit is even more                                                     // 804
// laughably inefficient. we recompute the whole results every time!                                                   // 805
// This binary search puts a value between any equal values, and the first                                             // 807
// lesser value.                                                                                                       // 808
                                                                                                                       //
                                                                                                                       //
LocalCollection._binarySearch = function (cmp, array, value) {                                                         // 809
  var first = 0;                                                                                                       // 810
  var range = array.length;                                                                                            // 811
                                                                                                                       //
  while (range > 0) {                                                                                                  // 813
    var halfRange = Math.floor(range / 2);                                                                             // 814
                                                                                                                       //
    if (cmp(value, array[first + halfRange]) >= 0) {                                                                   // 816
      first += halfRange + 1;                                                                                          // 817
      range -= halfRange + 1;                                                                                          // 818
    } else {                                                                                                           // 819
      range = halfRange;                                                                                               // 820
    }                                                                                                                  // 821
  }                                                                                                                    // 822
                                                                                                                       //
  return first;                                                                                                        // 824
};                                                                                                                     // 825
                                                                                                                       //
LocalCollection._checkSupportedProjection = function (fields) {                                                        // 827
  if (fields !== Object(fields) || Array.isArray(fields)) {                                                            // 828
    throw MinimongoError('fields option must be an object');                                                           // 829
  }                                                                                                                    // 830
                                                                                                                       //
  Object.keys(fields).forEach(function (keyPath) {                                                                     // 832
    if (keyPath.split('.').includes('$')) {                                                                            // 833
      throw MinimongoError('Minimongo doesn\'t support $ operator in projections yet.');                               // 834
    }                                                                                                                  // 837
                                                                                                                       //
    var value = fields[keyPath];                                                                                       // 839
                                                                                                                       //
    if ((typeof value === "undefined" ? "undefined" : (0, _typeof3.default)(value)) === 'object' && ['$elemMatch', '$meta', '$slice'].some(function (key) {
      return hasOwn.call(value, key);                                                                                  // 842
    })) {                                                                                                              // 842
      throw MinimongoError('Minimongo doesn\'t support operators in projections yet.');                                // 845
    }                                                                                                                  // 848
                                                                                                                       //
    if (![1, 0, true, false].includes(value)) {                                                                        // 850
      throw MinimongoError('Projection values should be one of 1, 0, true, or false');                                 // 851
    }                                                                                                                  // 854
  });                                                                                                                  // 855
}; // Knows how to compile a fields projection to a predicate function.                                                // 856
// @returns - Function: a closure that filters out an object according to the                                          // 859
//            fields projection rules:                                                                                 // 860
//            @param obj - Object: MongoDB-styled document                                                             // 861
//            @returns - Object: a document with the fields filtered out                                               // 862
//                       according to projection rules. Doesn't retain subfields                                       // 863
//                       of passed argument.                                                                           // 864
                                                                                                                       //
                                                                                                                       //
LocalCollection._compileProjection = function (fields) {                                                               // 865
  LocalCollection._checkSupportedProjection(fields);                                                                   // 866
                                                                                                                       //
  var _idProjection = fields._id === undefined ? true : fields._id;                                                    // 868
                                                                                                                       //
  var details = projectionDetails(fields); // returns transformed doc according to ruleTree                            // 869
                                                                                                                       //
  var transform = function (doc, ruleTree) {                                                                           // 872
    // Special case for "sets"                                                                                         // 873
    if (Array.isArray(doc)) {                                                                                          // 874
      return doc.map(function (subdoc) {                                                                               // 875
        return transform(subdoc, ruleTree);                                                                            // 875
      });                                                                                                              // 875
    }                                                                                                                  // 876
                                                                                                                       //
    var result = details.including ? {} : EJSON.clone(doc);                                                            // 878
    Object.keys(ruleTree).forEach(function (key) {                                                                     // 880
      if (!hasOwn.call(doc, key)) {                                                                                    // 881
        return;                                                                                                        // 882
      }                                                                                                                // 883
                                                                                                                       //
      var rule = ruleTree[key];                                                                                        // 885
                                                                                                                       //
      if (rule === Object(rule)) {                                                                                     // 887
        // For sub-objects/subsets we branch                                                                           // 888
        if (doc[key] === Object(doc[key])) {                                                                           // 889
          result[key] = transform(doc[key], rule);                                                                     // 890
        }                                                                                                              // 891
      } else if (details.including) {                                                                                  // 892
        // Otherwise we don't even touch this subfield                                                                 // 893
        result[key] = EJSON.clone(doc[key]);                                                                           // 894
      } else {                                                                                                         // 895
        delete result[key];                                                                                            // 896
      }                                                                                                                // 897
    });                                                                                                                // 898
    return result;                                                                                                     // 900
  };                                                                                                                   // 901
                                                                                                                       //
  return function (doc) {                                                                                              // 903
    var result = transform(doc, details.tree);                                                                         // 904
                                                                                                                       //
    if (_idProjection && hasOwn.call(doc, '_id')) {                                                                    // 906
      result._id = doc._id;                                                                                            // 907
    }                                                                                                                  // 908
                                                                                                                       //
    if (!_idProjection && hasOwn.call(result, '_id')) {                                                                // 910
      delete result._id;                                                                                               // 911
    }                                                                                                                  // 912
                                                                                                                       //
    return result;                                                                                                     // 914
  };                                                                                                                   // 915
}; // Calculates the document to insert in case we're doing an upsert and the                                          // 916
// selector does not match any elements                                                                                // 919
                                                                                                                       //
                                                                                                                       //
LocalCollection._createUpsertDocument = function (selector, modifier) {                                                // 920
  var selectorDocument = populateDocumentWithQueryFields(selector);                                                    // 921
                                                                                                                       //
  var isModify = LocalCollection._isModificationMod(modifier);                                                         // 922
                                                                                                                       //
  var newDoc = {};                                                                                                     // 924
                                                                                                                       //
  if (selectorDocument._id) {                                                                                          // 926
    newDoc._id = selectorDocument._id;                                                                                 // 927
    delete selectorDocument._id;                                                                                       // 928
  } // This double _modify call is made to help with nested properties (see issue                                      // 929
  // #8631). We do this even if it's a replacement for validation purposes (e.g.                                       // 932
  // ambiguous id's)                                                                                                   // 933
                                                                                                                       //
                                                                                                                       //
  LocalCollection._modify(newDoc, {                                                                                    // 934
    $set: selectorDocument                                                                                             // 934
  });                                                                                                                  // 934
                                                                                                                       //
  LocalCollection._modify(newDoc, modifier, {                                                                          // 935
    isInsert: true                                                                                                     // 935
  });                                                                                                                  // 935
                                                                                                                       //
  if (isModify) {                                                                                                      // 937
    return newDoc;                                                                                                     // 938
  } // Replacement can take _id from query document                                                                    // 939
                                                                                                                       //
                                                                                                                       //
  var replacement = Object.assign({}, modifier);                                                                       // 942
                                                                                                                       //
  if (newDoc._id) {                                                                                                    // 943
    replacement._id = newDoc._id;                                                                                      // 944
  }                                                                                                                    // 945
                                                                                                                       //
  return replacement;                                                                                                  // 947
};                                                                                                                     // 948
                                                                                                                       //
LocalCollection._diffObjects = function (left, right, callbacks) {                                                     // 950
  return DiffSequence.diffObjects(left, right, callbacks);                                                             // 951
}; // ordered: bool.                                                                                                   // 952
// old_results and new_results: collections of documents.                                                              // 955
//    if ordered, they are arrays.                                                                                     // 956
//    if unordered, they are IdMaps                                                                                    // 957
                                                                                                                       //
                                                                                                                       //
LocalCollection._diffQueryChanges = function (ordered, oldResults, newResults, observer, options) {                    // 958
  return DiffSequence.diffQueryChanges(ordered, oldResults, newResults, observer, options);                            // 958
};                                                                                                                     // 958
                                                                                                                       //
LocalCollection._diffQueryOrderedChanges = function (oldResults, newResults, observer, options) {                      // 962
  return DiffSequence.diffQueryOrderedChanges(oldResults, newResults, observer, options);                              // 962
};                                                                                                                     // 962
                                                                                                                       //
LocalCollection._diffQueryUnorderedChanges = function (oldResults, newResults, observer, options) {                    // 966
  return DiffSequence.diffQueryUnorderedChanges(oldResults, newResults, observer, options);                            // 966
};                                                                                                                     // 966
                                                                                                                       //
LocalCollection._findInOrderedResults = function (query, doc) {                                                        // 970
  if (!query.ordered) {                                                                                                // 971
    throw new Error('Can\'t call _findInOrderedResults on unordered query');                                           // 972
  }                                                                                                                    // 973
                                                                                                                       //
  for (var i = 0; i < query.results.length; i++) {                                                                     // 975
    if (query.results[i] === doc) {                                                                                    // 976
      return i;                                                                                                        // 977
    }                                                                                                                  // 978
  }                                                                                                                    // 979
                                                                                                                       //
  throw Error('object missing from query');                                                                            // 981
}; // If this is a selector which explicitly constrains the match by ID to a finite                                    // 982
// number of documents, returns a list of their IDs.  Otherwise returns                                                // 985
// null. Note that the selector may have other restrictions so it may not even                                         // 986
// match those document!  We care about $in and $and since those are generated                                         // 987
// access-controlled update and remove.                                                                                // 988
                                                                                                                       //
                                                                                                                       //
LocalCollection._idsMatchedBySelector = function (selector) {                                                          // 989
  // Is the selector just an ID?                                                                                       // 990
  if (LocalCollection._selectorIsId(selector)) {                                                                       // 991
    return [selector];                                                                                                 // 992
  }                                                                                                                    // 993
                                                                                                                       //
  if (!selector) {                                                                                                     // 995
    return null;                                                                                                       // 996
  } // Do we have an _id clause?                                                                                       // 997
                                                                                                                       //
                                                                                                                       //
  if (hasOwn.call(selector, '_id')) {                                                                                  // 1000
    // Is the _id clause just an ID?                                                                                   // 1001
    if (LocalCollection._selectorIsId(selector._id)) {                                                                 // 1002
      return [selector._id];                                                                                           // 1003
    } // Is the _id clause {_id: {$in: ["x", "y", "z"]}}?                                                              // 1004
                                                                                                                       //
                                                                                                                       //
    if (selector._id && Array.isArray(selector._id.$in) && selector._id.$in.length && selector._id.$in.every(LocalCollection._selectorIsId)) {
      return selector._id.$in;                                                                                         // 1011
    }                                                                                                                  // 1012
                                                                                                                       //
    return null;                                                                                                       // 1014
  } // If this is a top-level $and, and any of the clauses constrain their                                             // 1015
  // documents, then the whole selector is constrained by any one clause's                                             // 1018
  // constraint. (Well, by their intersection, but that seems unlikely.)                                               // 1019
                                                                                                                       //
                                                                                                                       //
  if (Array.isArray(selector.$and)) {                                                                                  // 1020
    for (var i = 0; i < selector.$and.length; ++i) {                                                                   // 1021
      var subIds = LocalCollection._idsMatchedBySelector(selector.$and[i]);                                            // 1022
                                                                                                                       //
      if (subIds) {                                                                                                    // 1024
        return subIds;                                                                                                 // 1025
      }                                                                                                                // 1026
    }                                                                                                                  // 1027
  }                                                                                                                    // 1028
                                                                                                                       //
  return null;                                                                                                         // 1030
};                                                                                                                     // 1031
                                                                                                                       //
LocalCollection._insertInResults = function (query, doc) {                                                             // 1033
  var fields = EJSON.clone(doc);                                                                                       // 1034
  delete fields._id;                                                                                                   // 1036
                                                                                                                       //
  if (query.ordered) {                                                                                                 // 1038
    if (!query.sorter) {                                                                                               // 1039
      query.addedBefore(doc._id, query.projectionFn(fields), null);                                                    // 1040
      query.results.push(doc);                                                                                         // 1041
    } else {                                                                                                           // 1042
      var i = LocalCollection._insertInSortedList(query.sorter.getComparator({                                         // 1043
        distances: query.distances                                                                                     // 1044
      }), query.results, doc);                                                                                         // 1044
                                                                                                                       //
      var next = query.results[i + 1];                                                                                 // 1049
                                                                                                                       //
      if (next) {                                                                                                      // 1050
        next = next._id;                                                                                               // 1051
      } else {                                                                                                         // 1052
        next = null;                                                                                                   // 1053
      }                                                                                                                // 1054
                                                                                                                       //
      query.addedBefore(doc._id, query.projectionFn(fields), next);                                                    // 1056
    }                                                                                                                  // 1057
                                                                                                                       //
    query.added(doc._id, query.projectionFn(fields));                                                                  // 1059
  } else {                                                                                                             // 1060
    query.added(doc._id, query.projectionFn(fields));                                                                  // 1061
    query.results.set(doc._id, doc);                                                                                   // 1062
  }                                                                                                                    // 1063
};                                                                                                                     // 1064
                                                                                                                       //
LocalCollection._insertInSortedList = function (cmp, array, value) {                                                   // 1066
  if (array.length === 0) {                                                                                            // 1067
    array.push(value);                                                                                                 // 1068
    return 0;                                                                                                          // 1069
  }                                                                                                                    // 1070
                                                                                                                       //
  var i = LocalCollection._binarySearch(cmp, array, value);                                                            // 1072
                                                                                                                       //
  array.splice(i, 0, value);                                                                                           // 1074
  return i;                                                                                                            // 1076
};                                                                                                                     // 1077
                                                                                                                       //
LocalCollection._isModificationMod = function (mod) {                                                                  // 1079
  var isModify = false;                                                                                                // 1080
  var isReplace = false;                                                                                               // 1081
  Object.keys(mod).forEach(function (key) {                                                                            // 1083
    if (key.substr(0, 1) === '$') {                                                                                    // 1084
      isModify = true;                                                                                                 // 1085
    } else {                                                                                                           // 1086
      isReplace = true;                                                                                                // 1087
    }                                                                                                                  // 1088
  });                                                                                                                  // 1089
                                                                                                                       //
  if (isModify && isReplace) {                                                                                         // 1091
    throw new Error('Update parameter cannot have both modifier and non-modifier fields.');                            // 1092
  }                                                                                                                    // 1095
                                                                                                                       //
  return isModify;                                                                                                     // 1097
}; // XXX maybe this should be EJSON.isObject, though EJSON doesn't know about                                         // 1098
// RegExp                                                                                                              // 1101
// XXX note that _type(undefined) === 3!!!!                                                                            // 1102
                                                                                                                       //
                                                                                                                       //
LocalCollection._isPlainObject = function (x) {                                                                        // 1103
  return x && LocalCollection._f._type(x) === 3;                                                                       // 1104
}; // XXX need a strategy for passing the binding of $ into this                                                       // 1105
// function, from the compiled selector                                                                                // 1108
//                                                                                                                     // 1109
// maybe just {key.up.to.just.before.dollarsign: array_index}                                                          // 1110
//                                                                                                                     // 1111
// XXX atomicity: if one modification fails, do we roll back the whole                                                 // 1112
// change?                                                                                                             // 1113
//                                                                                                                     // 1114
// options:                                                                                                            // 1115
//   - isInsert is set when _modify is being called to compute the document to                                         // 1116
//     insert as part of an upsert operation. We use this primarily to figure                                          // 1117
//     out when to set the fields in $setOnInsert, if present.                                                         // 1118
                                                                                                                       //
                                                                                                                       //
LocalCollection._modify = function (doc, modifier) {                                                                   // 1119
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                                // 1119
                                                                                                                       //
  if (!LocalCollection._isPlainObject(modifier)) {                                                                     // 1120
    throw MinimongoError('Modifier must be an object');                                                                // 1121
  } // Make sure the caller can't mutate our data structures.                                                          // 1122
                                                                                                                       //
                                                                                                                       //
  modifier = EJSON.clone(modifier);                                                                                    // 1125
  var isModifier = isOperatorObject(modifier);                                                                         // 1127
  var newDoc = isModifier ? EJSON.clone(doc) : modifier;                                                               // 1128
                                                                                                                       //
  if (isModifier) {                                                                                                    // 1130
    // apply modifiers to the doc.                                                                                     // 1131
    Object.keys(modifier).forEach(function (operator) {                                                                // 1132
      // Treat $setOnInsert as $set if this is an insert.                                                              // 1133
      var setOnInsert = options.isInsert && operator === '$setOnInsert';                                               // 1134
      var modFunc = MODIFIERS[setOnInsert ? '$set' : operator];                                                        // 1135
      var operand = modifier[operator];                                                                                // 1136
                                                                                                                       //
      if (!modFunc) {                                                                                                  // 1138
        throw MinimongoError("Invalid modifier specified " + operator);                                                // 1139
      }                                                                                                                // 1140
                                                                                                                       //
      Object.keys(operand).forEach(function (keypath) {                                                                // 1142
        var arg = operand[keypath];                                                                                    // 1143
                                                                                                                       //
        if (keypath === '') {                                                                                          // 1145
          throw MinimongoError('An empty update path is not valid.');                                                  // 1146
        }                                                                                                              // 1147
                                                                                                                       //
        var keyparts = keypath.split('.');                                                                             // 1149
                                                                                                                       //
        if (!keyparts.every(Boolean)) {                                                                                // 1151
          throw MinimongoError("The update path '" + keypath + "' contains an empty field name, " + 'which is not allowed.');
        }                                                                                                              // 1156
                                                                                                                       //
        var target = findModTarget(newDoc, keyparts, {                                                                 // 1158
          arrayIndices: options.arrayIndices,                                                                          // 1159
          forbidArray: operator === '$rename',                                                                         // 1160
          noCreate: NO_CREATE_MODIFIERS[operator]                                                                      // 1161
        });                                                                                                            // 1158
        modFunc(target, keyparts.pop(), arg, keypath, newDoc);                                                         // 1164
      });                                                                                                              // 1165
    });                                                                                                                // 1166
                                                                                                                       //
    if (doc._id && !EJSON.equals(doc._id, newDoc._id)) {                                                               // 1168
      throw MinimongoError("After applying the update to the document {_id: \"" + doc._id + "\", ...}," + ' the (immutable) field \'_id\' was found to have been altered to ' + ("_id: \"" + newDoc._id + "\""));
    }                                                                                                                  // 1174
  } else {                                                                                                             // 1175
    if (doc._id && modifier._id && !EJSON.equals(doc._id, modifier._id)) {                                             // 1176
      throw MinimongoError("The _id field cannot be changed from {_id: \"" + doc._id + "\"} to " + ("{_id: \"" + modifier._id + "\"}"));
    } // replace the whole document                                                                                    // 1181
                                                                                                                       //
                                                                                                                       //
    assertHasValidFieldNames(modifier);                                                                                // 1184
  } // move new document into place.                                                                                   // 1185
                                                                                                                       //
                                                                                                                       //
  Object.keys(doc).forEach(function (key) {                                                                            // 1188
    // Note: this used to be for (var key in doc) however, this does not                                               // 1189
    // work right in Opera. Deleting from a doc while iterating over it                                                // 1190
    // would sometimes cause opera to skip some keys.                                                                  // 1191
    if (key !== '_id') {                                                                                               // 1192
      delete doc[key];                                                                                                 // 1193
    }                                                                                                                  // 1194
  });                                                                                                                  // 1195
  Object.keys(newDoc).forEach(function (key) {                                                                         // 1197
    doc[key] = newDoc[key];                                                                                            // 1198
  });                                                                                                                  // 1199
};                                                                                                                     // 1200
                                                                                                                       //
LocalCollection._observeFromObserveChanges = function (cursor, observeCallbacks) {                                     // 1202
  var transform = cursor.getTransform() || function (doc) {                                                            // 1203
    return doc;                                                                                                        // 1203
  };                                                                                                                   // 1203
                                                                                                                       //
  var suppressed = !!observeCallbacks._suppress_initial;                                                               // 1204
  var observeChangesCallbacks = void 0;                                                                                // 1206
                                                                                                                       //
  if (LocalCollection._observeCallbacksAreOrdered(observeCallbacks)) {                                                 // 1207
    // The "_no_indices" option sets all index arguments to -1 and skips the                                           // 1208
    // linear scans required to generate them.  This lets observers that don't                                         // 1209
    // need absolute indices benefit from the other features of this API --                                            // 1210
    // relative order, transforms, and applyChanges -- without the speed hit.                                          // 1211
    var indices = !observeCallbacks._no_indices;                                                                       // 1212
    observeChangesCallbacks = {                                                                                        // 1214
      addedBefore: function (id, fields, before) {                                                                     // 1215
        if (suppressed || !(observeCallbacks.addedAt || observeCallbacks.added)) {                                     // 1216
          return;                                                                                                      // 1217
        }                                                                                                              // 1218
                                                                                                                       //
        var doc = transform(Object.assign(fields, {                                                                    // 1220
          _id: id                                                                                                      // 1220
        }));                                                                                                           // 1220
                                                                                                                       //
        if (observeCallbacks.addedAt) {                                                                                // 1222
          observeCallbacks.addedAt(doc, indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1, before);
        } else {                                                                                                       // 1232
          observeCallbacks.added(doc);                                                                                 // 1233
        }                                                                                                              // 1234
      },                                                                                                               // 1235
      changed: function (id, fields) {                                                                                 // 1236
        if (!(observeCallbacks.changedAt || observeCallbacks.changed)) {                                               // 1237
          return;                                                                                                      // 1238
        }                                                                                                              // 1239
                                                                                                                       //
        var doc = EJSON.clone(this.docs.get(id));                                                                      // 1241
                                                                                                                       //
        if (!doc) {                                                                                                    // 1242
          throw new Error("Unknown id for changed: " + id);                                                            // 1243
        }                                                                                                              // 1244
                                                                                                                       //
        var oldDoc = transform(EJSON.clone(doc));                                                                      // 1246
        DiffSequence.applyChanges(doc, fields);                                                                        // 1248
                                                                                                                       //
        if (observeCallbacks.changedAt) {                                                                              // 1250
          observeCallbacks.changedAt(transform(doc), oldDoc, indices ? this.docs.indexOf(id) : -1);                    // 1251
        } else {                                                                                                       // 1256
          observeCallbacks.changed(transform(doc), oldDoc);                                                            // 1257
        }                                                                                                              // 1258
      },                                                                                                               // 1259
      movedBefore: function (id, before) {                                                                             // 1260
        if (!observeCallbacks.movedTo) {                                                                               // 1261
          return;                                                                                                      // 1262
        }                                                                                                              // 1263
                                                                                                                       //
        var from = indices ? this.docs.indexOf(id) : -1;                                                               // 1265
        var to = indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1; // When not moving backwards, adjust for the fact that removing the
        // document slides everything back one slot.                                                                   // 1273
                                                                                                                       //
        if (to > from) {                                                                                               // 1274
          --to;                                                                                                        // 1275
        }                                                                                                              // 1276
                                                                                                                       //
        observeCallbacks.movedTo(transform(EJSON.clone(this.docs.get(id))), from, to, before || null);                 // 1278
      },                                                                                                               // 1284
      removed: function (id) {                                                                                         // 1285
        if (!(observeCallbacks.removedAt || observeCallbacks.removed)) {                                               // 1286
          return;                                                                                                      // 1287
        } // technically maybe there should be an EJSON.clone here, but it's about                                     // 1288
        // to be removed from this.docs!                                                                               // 1291
                                                                                                                       //
                                                                                                                       //
        var doc = transform(this.docs.get(id));                                                                        // 1292
                                                                                                                       //
        if (observeCallbacks.removedAt) {                                                                              // 1294
          observeCallbacks.removedAt(doc, indices ? this.docs.indexOf(id) : -1);                                       // 1295
        } else {                                                                                                       // 1296
          observeCallbacks.removed(doc);                                                                               // 1297
        }                                                                                                              // 1298
      }                                                                                                                // 1299
    };                                                                                                                 // 1214
  } else {                                                                                                             // 1301
    observeChangesCallbacks = {                                                                                        // 1302
      added: function (id, fields) {                                                                                   // 1303
        if (!suppressed && observeCallbacks.added) {                                                                   // 1304
          observeCallbacks.added(transform(Object.assign(fields, {                                                     // 1305
            _id: id                                                                                                    // 1305
          })));                                                                                                        // 1305
        }                                                                                                              // 1306
      },                                                                                                               // 1307
      changed: function (id, fields) {                                                                                 // 1308
        if (observeCallbacks.changed) {                                                                                // 1309
          var oldDoc = this.docs.get(id);                                                                              // 1310
          var doc = EJSON.clone(oldDoc);                                                                               // 1311
          DiffSequence.applyChanges(doc, fields);                                                                      // 1313
          observeCallbacks.changed(transform(doc), transform(EJSON.clone(oldDoc)));                                    // 1315
        }                                                                                                              // 1319
      },                                                                                                               // 1320
      removed: function (id) {                                                                                         // 1321
        if (observeCallbacks.removed) {                                                                                // 1322
          observeCallbacks.removed(transform(this.docs.get(id)));                                                      // 1323
        }                                                                                                              // 1324
      }                                                                                                                // 1325
    };                                                                                                                 // 1302
  }                                                                                                                    // 1327
                                                                                                                       //
  var changeObserver = new LocalCollection._CachingChangeObserver({                                                    // 1329
    callbacks: observeChangesCallbacks                                                                                 // 1330
  });                                                                                                                  // 1329
  var handle = cursor.observeChanges(changeObserver.applyChange);                                                      // 1333
  suppressed = false;                                                                                                  // 1335
  return handle;                                                                                                       // 1337
};                                                                                                                     // 1338
                                                                                                                       //
LocalCollection._observeCallbacksAreOrdered = function (callbacks) {                                                   // 1340
  if (callbacks.added && callbacks.addedAt) {                                                                          // 1341
    throw new Error('Please specify only one of added() and addedAt()');                                               // 1342
  }                                                                                                                    // 1343
                                                                                                                       //
  if (callbacks.changed && callbacks.changedAt) {                                                                      // 1345
    throw new Error('Please specify only one of changed() and changedAt()');                                           // 1346
  }                                                                                                                    // 1347
                                                                                                                       //
  if (callbacks.removed && callbacks.removedAt) {                                                                      // 1349
    throw new Error('Please specify only one of removed() and removedAt()');                                           // 1350
  }                                                                                                                    // 1351
                                                                                                                       //
  return !!(callbacks.addedAt || callbacks.changedAt || callbacks.movedTo || callbacks.removedAt);                     // 1353
};                                                                                                                     // 1359
                                                                                                                       //
LocalCollection._observeChangesCallbacksAreOrdered = function (callbacks) {                                            // 1361
  if (callbacks.added && callbacks.addedBefore) {                                                                      // 1362
    throw new Error('Please specify only one of added() and addedBefore()');                                           // 1363
  }                                                                                                                    // 1364
                                                                                                                       //
  return !!(callbacks.addedBefore || callbacks.movedBefore);                                                           // 1366
};                                                                                                                     // 1367
                                                                                                                       //
LocalCollection._removeFromResults = function (query, doc) {                                                           // 1369
  if (query.ordered) {                                                                                                 // 1370
    var i = LocalCollection._findInOrderedResults(query, doc);                                                         // 1371
                                                                                                                       //
    query.removed(doc._id);                                                                                            // 1373
    query.results.splice(i, 1);                                                                                        // 1374
  } else {                                                                                                             // 1375
    var id = doc._id; // in case callback mutates doc                                                                  // 1376
                                                                                                                       //
    query.removed(doc._id);                                                                                            // 1378
    query.results.remove(id);                                                                                          // 1379
  }                                                                                                                    // 1380
}; // Is this selector just shorthand for lookup by _id?                                                               // 1381
                                                                                                                       //
                                                                                                                       //
LocalCollection._selectorIsId = function (selector) {                                                                  // 1384
  return typeof selector === 'number' || typeof selector === 'string' || selector instanceof MongoID.ObjectID;         // 1384
}; // Is the selector just lookup by _id (shorthand or not)?                                                           // 1384
                                                                                                                       //
                                                                                                                       //
LocalCollection._selectorIsIdPerhapsAsObject = function (selector) {                                                   // 1391
  return LocalCollection._selectorIsId(selector) || LocalCollection._selectorIsId(selector && selector._id) && Object.keys(selector).length === 1;
};                                                                                                                     // 1391
                                                                                                                       //
LocalCollection._updateInResults = function (query, doc, old_doc) {                                                    // 1397
  if (!EJSON.equals(doc._id, old_doc._id)) {                                                                           // 1398
    throw new Error('Can\'t change a doc\'s _id while updating');                                                      // 1399
  }                                                                                                                    // 1400
                                                                                                                       //
  var projectionFn = query.projectionFn;                                                                               // 1402
  var changedFields = DiffSequence.makeChangedFields(projectionFn(doc), projectionFn(old_doc));                        // 1403
                                                                                                                       //
  if (!query.ordered) {                                                                                                // 1408
    if (Object.keys(changedFields).length) {                                                                           // 1409
      query.changed(doc._id, changedFields);                                                                           // 1410
      query.results.set(doc._id, doc);                                                                                 // 1411
    }                                                                                                                  // 1412
                                                                                                                       //
    return;                                                                                                            // 1414
  }                                                                                                                    // 1415
                                                                                                                       //
  var old_idx = LocalCollection._findInOrderedResults(query, doc);                                                     // 1417
                                                                                                                       //
  if (Object.keys(changedFields).length) {                                                                             // 1419
    query.changed(doc._id, changedFields);                                                                             // 1420
  }                                                                                                                    // 1421
                                                                                                                       //
  if (!query.sorter) {                                                                                                 // 1423
    return;                                                                                                            // 1424
  } // just take it out and put it back in again, and see if the index changes                                         // 1425
                                                                                                                       //
                                                                                                                       //
  query.results.splice(old_idx, 1);                                                                                    // 1428
                                                                                                                       //
  var new_idx = LocalCollection._insertInSortedList(query.sorter.getComparator({                                       // 1430
    distances: query.distances                                                                                         // 1431
  }), query.results, doc);                                                                                             // 1431
                                                                                                                       //
  if (old_idx !== new_idx) {                                                                                           // 1436
    var next = query.results[new_idx + 1];                                                                             // 1437
                                                                                                                       //
    if (next) {                                                                                                        // 1438
      next = next._id;                                                                                                 // 1439
    } else {                                                                                                           // 1440
      next = null;                                                                                                     // 1441
    }                                                                                                                  // 1442
                                                                                                                       //
    query.movedBefore && query.movedBefore(doc._id, next);                                                             // 1444
  }                                                                                                                    // 1445
};                                                                                                                     // 1446
                                                                                                                       //
var MODIFIERS = {                                                                                                      // 1448
  $currentDate: function (target, field, arg) {                                                                        // 1449
    if ((typeof arg === "undefined" ? "undefined" : (0, _typeof3.default)(arg)) === 'object' && hasOwn.call(arg, '$type')) {
      if (arg.$type !== 'date') {                                                                                      // 1451
        throw MinimongoError('Minimongo does currently only support the date type in ' + '$currentDate modifiers', {   // 1452
          field: field                                                                                                 // 1455
        });                                                                                                            // 1455
      }                                                                                                                // 1457
    } else if (arg !== true) {                                                                                         // 1458
      throw MinimongoError('Invalid $currentDate modifier', {                                                          // 1459
        field: field                                                                                                   // 1459
      });                                                                                                              // 1459
    }                                                                                                                  // 1460
                                                                                                                       //
    target[field] = new Date();                                                                                        // 1462
  },                                                                                                                   // 1463
  $min: function (target, field, arg) {                                                                                // 1464
    if (typeof arg !== 'number') {                                                                                     // 1465
      throw MinimongoError('Modifier $min allowed for numbers only', {                                                 // 1466
        field: field                                                                                                   // 1466
      });                                                                                                              // 1466
    }                                                                                                                  // 1467
                                                                                                                       //
    if (field in target) {                                                                                             // 1469
      if (typeof target[field] !== 'number') {                                                                         // 1470
        throw MinimongoError('Cannot apply $min modifier to non-number', {                                             // 1471
          field: field                                                                                                 // 1473
        });                                                                                                            // 1473
      }                                                                                                                // 1475
                                                                                                                       //
      if (target[field] > arg) {                                                                                       // 1477
        target[field] = arg;                                                                                           // 1478
      }                                                                                                                // 1479
    } else {                                                                                                           // 1480
      target[field] = arg;                                                                                             // 1481
    }                                                                                                                  // 1482
  },                                                                                                                   // 1483
  $max: function (target, field, arg) {                                                                                // 1484
    if (typeof arg !== 'number') {                                                                                     // 1485
      throw MinimongoError('Modifier $max allowed for numbers only', {                                                 // 1486
        field: field                                                                                                   // 1486
      });                                                                                                              // 1486
    }                                                                                                                  // 1487
                                                                                                                       //
    if (field in target) {                                                                                             // 1489
      if (typeof target[field] !== 'number') {                                                                         // 1490
        throw MinimongoError('Cannot apply $max modifier to non-number', {                                             // 1491
          field: field                                                                                                 // 1493
        });                                                                                                            // 1493
      }                                                                                                                // 1495
                                                                                                                       //
      if (target[field] < arg) {                                                                                       // 1497
        target[field] = arg;                                                                                           // 1498
      }                                                                                                                // 1499
    } else {                                                                                                           // 1500
      target[field] = arg;                                                                                             // 1501
    }                                                                                                                  // 1502
  },                                                                                                                   // 1503
  $inc: function (target, field, arg) {                                                                                // 1504
    if (typeof arg !== 'number') {                                                                                     // 1505
      throw MinimongoError('Modifier $inc allowed for numbers only', {                                                 // 1506
        field: field                                                                                                   // 1506
      });                                                                                                              // 1506
    }                                                                                                                  // 1507
                                                                                                                       //
    if (field in target) {                                                                                             // 1509
      if (typeof target[field] !== 'number') {                                                                         // 1510
        throw MinimongoError('Cannot apply $inc modifier to non-number', {                                             // 1511
          field: field                                                                                                 // 1513
        });                                                                                                            // 1513
      }                                                                                                                // 1515
                                                                                                                       //
      target[field] += arg;                                                                                            // 1517
    } else {                                                                                                           // 1518
      target[field] = arg;                                                                                             // 1519
    }                                                                                                                  // 1520
  },                                                                                                                   // 1521
  $set: function (target, field, arg) {                                                                                // 1522
    if (target !== Object(target)) {                                                                                   // 1523
      // not an array or an object                                                                                     // 1523
      var error = MinimongoError('Cannot set property on non-object field', {                                          // 1524
        field: field                                                                                                   // 1526
      });                                                                                                              // 1526
      error.setPropertyError = true;                                                                                   // 1528
      throw error;                                                                                                     // 1529
    }                                                                                                                  // 1530
                                                                                                                       //
    if (target === null) {                                                                                             // 1532
      var _error = MinimongoError('Cannot set property on null', {                                                     // 1533
        field: field                                                                                                   // 1533
      });                                                                                                              // 1533
                                                                                                                       //
      _error.setPropertyError = true;                                                                                  // 1534
      throw _error;                                                                                                    // 1535
    }                                                                                                                  // 1536
                                                                                                                       //
    assertHasValidFieldNames(arg);                                                                                     // 1538
    target[field] = arg;                                                                                               // 1540
  },                                                                                                                   // 1541
  $setOnInsert: function (target, field, arg) {// converted to `$set` in `_modify`                                     // 1542
  },                                                                                                                   // 1544
  $unset: function (target, field, arg) {                                                                              // 1545
    if (target !== undefined) {                                                                                        // 1546
      if (target instanceof Array) {                                                                                   // 1547
        if (field in target) {                                                                                         // 1548
          target[field] = null;                                                                                        // 1549
        }                                                                                                              // 1550
      } else {                                                                                                         // 1551
        delete target[field];                                                                                          // 1552
      }                                                                                                                // 1553
    }                                                                                                                  // 1554
  },                                                                                                                   // 1555
  $push: function (target, field, arg) {                                                                               // 1556
    if (target[field] === undefined) {                                                                                 // 1557
      target[field] = [];                                                                                              // 1558
    }                                                                                                                  // 1559
                                                                                                                       //
    if (!(target[field] instanceof Array)) {                                                                           // 1561
      throw MinimongoError('Cannot apply $push modifier to non-array', {                                               // 1562
        field: field                                                                                                   // 1562
      });                                                                                                              // 1562
    }                                                                                                                  // 1563
                                                                                                                       //
    if (!(arg && arg.$each)) {                                                                                         // 1565
      // Simple mode: not $each                                                                                        // 1566
      assertHasValidFieldNames(arg);                                                                                   // 1567
      target[field].push(arg);                                                                                         // 1569
      return;                                                                                                          // 1571
    } // Fancy mode: $each (and maybe $slice and $sort and $position)                                                  // 1572
                                                                                                                       //
                                                                                                                       //
    var toPush = arg.$each;                                                                                            // 1575
                                                                                                                       //
    if (!(toPush instanceof Array)) {                                                                                  // 1576
      throw MinimongoError('$each must be an array', {                                                                 // 1577
        field: field                                                                                                   // 1577
      });                                                                                                              // 1577
    }                                                                                                                  // 1578
                                                                                                                       //
    assertHasValidFieldNames(toPush); // Parse $position                                                               // 1580
                                                                                                                       //
    var position = undefined;                                                                                          // 1583
                                                                                                                       //
    if ('$position' in arg) {                                                                                          // 1584
      if (typeof arg.$position !== 'number') {                                                                         // 1585
        throw MinimongoError('$position must be a numeric value', {                                                    // 1586
          field: field                                                                                                 // 1586
        });                                                                                                            // 1586
      } // XXX should check to make sure integer                                                                       // 1587
                                                                                                                       //
                                                                                                                       //
      if (arg.$position < 0) {                                                                                         // 1590
        throw MinimongoError('$position in $push must be zero or positive', {                                          // 1591
          field: field                                                                                                 // 1593
        });                                                                                                            // 1593
      }                                                                                                                // 1595
                                                                                                                       //
      position = arg.$position;                                                                                        // 1597
    } // Parse $slice.                                                                                                 // 1598
                                                                                                                       //
                                                                                                                       //
    var slice = undefined;                                                                                             // 1601
                                                                                                                       //
    if ('$slice' in arg) {                                                                                             // 1602
      if (typeof arg.$slice !== 'number') {                                                                            // 1603
        throw MinimongoError('$slice must be a numeric value', {                                                       // 1604
          field: field                                                                                                 // 1604
        });                                                                                                            // 1604
      } // XXX should check to make sure integer                                                                       // 1605
                                                                                                                       //
                                                                                                                       //
      slice = arg.$slice;                                                                                              // 1608
    } // Parse $sort.                                                                                                  // 1609
                                                                                                                       //
                                                                                                                       //
    var sortFunction = undefined;                                                                                      // 1612
                                                                                                                       //
    if (arg.$sort) {                                                                                                   // 1613
      if (slice === undefined) {                                                                                       // 1614
        throw MinimongoError('$sort requires $slice to be present', {                                                  // 1615
          field: field                                                                                                 // 1615
        });                                                                                                            // 1615
      } // XXX this allows us to use a $sort whose value is an array, but that's                                       // 1616
      // actually an extension of the Node driver, so it won't work                                                    // 1619
      // server-side. Could be confusing!                                                                              // 1620
      // XXX is it correct that we don't do geo-stuff here?                                                            // 1621
                                                                                                                       //
                                                                                                                       //
      sortFunction = new Minimongo.Sorter(arg.$sort).getComparator();                                                  // 1622
      toPush.forEach(function (element) {                                                                              // 1624
        if (LocalCollection._f._type(element) !== 3) {                                                                 // 1625
          throw MinimongoError('$push like modifiers using $sort require all elements to be ' + 'objects', {           // 1626
            field: field                                                                                               // 1629
          });                                                                                                          // 1629
        }                                                                                                              // 1631
      });                                                                                                              // 1632
    } // Actually push.                                                                                                // 1633
                                                                                                                       //
                                                                                                                       //
    if (position === undefined) {                                                                                      // 1636
      toPush.forEach(function (element) {                                                                              // 1637
        target[field].push(element);                                                                                   // 1638
      });                                                                                                              // 1639
    } else {                                                                                                           // 1640
      var _target$field;                                                                                               // 1640
                                                                                                                       //
      var spliceArguments = [position, 0];                                                                             // 1641
      toPush.forEach(function (element) {                                                                              // 1643
        spliceArguments.push(element);                                                                                 // 1644
      });                                                                                                              // 1645
                                                                                                                       //
      (_target$field = target[field]).splice.apply(_target$field, spliceArguments);                                    // 1647
    } // Actually sort.                                                                                                // 1648
                                                                                                                       //
                                                                                                                       //
    if (sortFunction) {                                                                                                // 1651
      target[field].sort(sortFunction);                                                                                // 1652
    } // Actually slice.                                                                                               // 1653
                                                                                                                       //
                                                                                                                       //
    if (slice !== undefined) {                                                                                         // 1656
      if (slice === 0) {                                                                                               // 1657
        target[field] = []; // differs from Array.slice!                                                               // 1658
      } else if (slice < 0) {                                                                                          // 1659
        target[field] = target[field].slice(slice);                                                                    // 1660
      } else {                                                                                                         // 1661
        target[field] = target[field].slice(0, slice);                                                                 // 1662
      }                                                                                                                // 1663
    }                                                                                                                  // 1664
  },                                                                                                                   // 1665
  $pushAll: function (target, field, arg) {                                                                            // 1666
    if (!((typeof arg === "undefined" ? "undefined" : (0, _typeof3.default)(arg)) === 'object' && arg instanceof Array)) {
      throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only');                                       // 1668
    }                                                                                                                  // 1669
                                                                                                                       //
    assertHasValidFieldNames(arg);                                                                                     // 1671
    var toPush = target[field];                                                                                        // 1673
                                                                                                                       //
    if (toPush === undefined) {                                                                                        // 1675
      target[field] = arg;                                                                                             // 1676
    } else if (!(toPush instanceof Array)) {                                                                           // 1677
      throw MinimongoError('Cannot apply $pushAll modifier to non-array', {                                            // 1678
        field: field                                                                                                   // 1680
      });                                                                                                              // 1680
    } else {                                                                                                           // 1682
      toPush.push.apply(toPush, (0, _toConsumableArray3.default)(arg));                                                // 1683
    }                                                                                                                  // 1684
  },                                                                                                                   // 1685
  $addToSet: function (target, field, arg) {                                                                           // 1686
    var isEach = false;                                                                                                // 1687
                                                                                                                       //
    if ((typeof arg === "undefined" ? "undefined" : (0, _typeof3.default)(arg)) === 'object') {                        // 1689
      // check if first key is '$each'                                                                                 // 1690
      var keys = Object.keys(arg);                                                                                     // 1691
                                                                                                                       //
      if (keys[0] === '$each') {                                                                                       // 1692
        isEach = true;                                                                                                 // 1693
      }                                                                                                                // 1694
    }                                                                                                                  // 1695
                                                                                                                       //
    var values = isEach ? arg.$each : [arg];                                                                           // 1697
    assertHasValidFieldNames(values);                                                                                  // 1699
    var toAdd = target[field];                                                                                         // 1701
                                                                                                                       //
    if (toAdd === undefined) {                                                                                         // 1702
      target[field] = values;                                                                                          // 1703
    } else if (!(toAdd instanceof Array)) {                                                                            // 1704
      throw MinimongoError('Cannot apply $addToSet modifier to non-array', {                                           // 1705
        field: field                                                                                                   // 1707
      });                                                                                                              // 1707
    } else {                                                                                                           // 1709
      values.forEach(function (value) {                                                                                // 1710
        if (toAdd.some(function (element) {                                                                            // 1711
          return LocalCollection._f._equal(value, element);                                                            // 1711
        })) {                                                                                                          // 1711
          return;                                                                                                      // 1712
        }                                                                                                              // 1713
                                                                                                                       //
        toAdd.push(value);                                                                                             // 1715
      });                                                                                                              // 1716
    }                                                                                                                  // 1717
  },                                                                                                                   // 1718
  $pop: function (target, field, arg) {                                                                                // 1719
    if (target === undefined) {                                                                                        // 1720
      return;                                                                                                          // 1721
    }                                                                                                                  // 1722
                                                                                                                       //
    var toPop = target[field];                                                                                         // 1724
                                                                                                                       //
    if (toPop === undefined) {                                                                                         // 1726
      return;                                                                                                          // 1727
    }                                                                                                                  // 1728
                                                                                                                       //
    if (!(toPop instanceof Array)) {                                                                                   // 1730
      throw MinimongoError('Cannot apply $pop modifier to non-array', {                                                // 1731
        field: field                                                                                                   // 1731
      });                                                                                                              // 1731
    }                                                                                                                  // 1732
                                                                                                                       //
    if (typeof arg === 'number' && arg < 0) {                                                                          // 1734
      toPop.splice(0, 1);                                                                                              // 1735
    } else {                                                                                                           // 1736
      toPop.pop();                                                                                                     // 1737
    }                                                                                                                  // 1738
  },                                                                                                                   // 1739
  $pull: function (target, field, arg) {                                                                               // 1740
    if (target === undefined) {                                                                                        // 1741
      return;                                                                                                          // 1742
    }                                                                                                                  // 1743
                                                                                                                       //
    var toPull = target[field];                                                                                        // 1745
                                                                                                                       //
    if (toPull === undefined) {                                                                                        // 1746
      return;                                                                                                          // 1747
    }                                                                                                                  // 1748
                                                                                                                       //
    if (!(toPull instanceof Array)) {                                                                                  // 1750
      throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {                                       // 1751
        field: field                                                                                                   // 1753
      });                                                                                                              // 1753
    }                                                                                                                  // 1755
                                                                                                                       //
    var out = void 0;                                                                                                  // 1757
                                                                                                                       //
    if (arg != null && (typeof arg === "undefined" ? "undefined" : (0, _typeof3.default)(arg)) === 'object' && !(arg instanceof Array)) {
      // XXX would be much nicer to compile this once, rather than                                                     // 1759
      // for each document we modify.. but usually we're not                                                           // 1760
      // modifying that many documents, so we'll let it slide for                                                      // 1761
      // now                                                                                                           // 1762
      // XXX Minimongo.Matcher isn't up for the job, because we need                                                   // 1764
      // to permit stuff like {$pull: {a: {$gt: 4}}}.. something                                                       // 1765
      // like {$gt: 4} is not normally a complete selector.                                                            // 1766
      // same issue as $elemMatch possibly?                                                                            // 1767
      var matcher = new Minimongo.Matcher(arg);                                                                        // 1768
      out = toPull.filter(function (element) {                                                                         // 1770
        return !matcher.documentMatches(element).result;                                                               // 1770
      });                                                                                                              // 1770
    } else {                                                                                                           // 1771
      out = toPull.filter(function (element) {                                                                         // 1772
        return !LocalCollection._f._equal(element, arg);                                                               // 1772
      });                                                                                                              // 1772
    }                                                                                                                  // 1773
                                                                                                                       //
    target[field] = out;                                                                                               // 1775
  },                                                                                                                   // 1776
  $pullAll: function (target, field, arg) {                                                                            // 1777
    if (!((typeof arg === "undefined" ? "undefined" : (0, _typeof3.default)(arg)) === 'object' && arg instanceof Array)) {
      throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only', {                                      // 1779
        field: field                                                                                                   // 1781
      });                                                                                                              // 1781
    }                                                                                                                  // 1783
                                                                                                                       //
    if (target === undefined) {                                                                                        // 1785
      return;                                                                                                          // 1786
    }                                                                                                                  // 1787
                                                                                                                       //
    var toPull = target[field];                                                                                        // 1789
                                                                                                                       //
    if (toPull === undefined) {                                                                                        // 1791
      return;                                                                                                          // 1792
    }                                                                                                                  // 1793
                                                                                                                       //
    if (!(toPull instanceof Array)) {                                                                                  // 1795
      throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {                                       // 1796
        field: field                                                                                                   // 1798
      });                                                                                                              // 1798
    }                                                                                                                  // 1800
                                                                                                                       //
    target[field] = toPull.filter(function (object) {                                                                  // 1802
      return !arg.some(function (element) {                                                                            // 1802
        return LocalCollection._f._equal(object, element);                                                             // 1803
      });                                                                                                              // 1803
    });                                                                                                                // 1802
  },                                                                                                                   // 1805
  $rename: function (target, field, arg, keypath, doc) {                                                               // 1806
    // no idea why mongo has this restriction..                                                                        // 1807
    if (keypath === arg) {                                                                                             // 1808
      throw MinimongoError('$rename source must differ from target', {                                                 // 1809
        field: field                                                                                                   // 1809
      });                                                                                                              // 1809
    }                                                                                                                  // 1810
                                                                                                                       //
    if (target === null) {                                                                                             // 1812
      throw MinimongoError('$rename source field invalid', {                                                           // 1813
        field: field                                                                                                   // 1813
      });                                                                                                              // 1813
    }                                                                                                                  // 1814
                                                                                                                       //
    if (typeof arg !== 'string') {                                                                                     // 1816
      throw MinimongoError('$rename target must be a string', {                                                        // 1817
        field: field                                                                                                   // 1817
      });                                                                                                              // 1817
    }                                                                                                                  // 1818
                                                                                                                       //
    if (arg.includes('\0')) {                                                                                          // 1820
      // Null bytes are not allowed in Mongo field names                                                               // 1821
      // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names                                 // 1822
      throw MinimongoError('The \'to\' field for $rename cannot contain an embedded null byte', {                      // 1823
        field: field                                                                                                   // 1825
      });                                                                                                              // 1825
    }                                                                                                                  // 1827
                                                                                                                       //
    if (target === undefined) {                                                                                        // 1829
      return;                                                                                                          // 1830
    }                                                                                                                  // 1831
                                                                                                                       //
    var object = target[field];                                                                                        // 1833
    delete target[field];                                                                                              // 1835
    var keyparts = arg.split('.');                                                                                     // 1837
    var target2 = findModTarget(doc, keyparts, {                                                                       // 1838
      forbidArray: true                                                                                                // 1838
    });                                                                                                                // 1838
                                                                                                                       //
    if (target2 === null) {                                                                                            // 1840
      throw MinimongoError('$rename target field invalid', {                                                           // 1841
        field: field                                                                                                   // 1841
      });                                                                                                              // 1841
    }                                                                                                                  // 1842
                                                                                                                       //
    target2[keyparts.pop()] = object;                                                                                  // 1844
  },                                                                                                                   // 1845
  $bit: function (target, field, arg) {                                                                                // 1846
    // XXX mongo only supports $bit on integers, and we only support                                                   // 1847
    // native javascript numbers (doubles) so far, so we can't support $bit                                            // 1848
    throw MinimongoError('$bit is not supported', {                                                                    // 1849
      field: field                                                                                                     // 1849
    });                                                                                                                // 1849
  }                                                                                                                    // 1850
};                                                                                                                     // 1448
var NO_CREATE_MODIFIERS = {                                                                                            // 1853
  $pop: true,                                                                                                          // 1854
  $pull: true,                                                                                                         // 1855
  $pullAll: true,                                                                                                      // 1856
  $rename: true,                                                                                                       // 1857
  $unset: true                                                                                                         // 1858
}; // Make sure field names do not contain Mongo restricted                                                            // 1853
// characters ('.', '$', '\0').                                                                                        // 1862
// https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names                                       // 1863
                                                                                                                       //
var invalidCharMsg = {                                                                                                 // 1864
  $: 'start with \'$\'',                                                                                               // 1865
  '.': 'contain \'.\'',                                                                                                // 1866
  '\0': 'contain null bytes'                                                                                           // 1867
}; // checks if all field names in an object are valid                                                                 // 1864
                                                                                                                       //
function assertHasValidFieldNames(doc) {                                                                               // 1871
  if (doc && (typeof doc === "undefined" ? "undefined" : (0, _typeof3.default)(doc)) === 'object') {                   // 1872
    JSON.stringify(doc, function (key, value) {                                                                        // 1873
      assertIsValidFieldName(key);                                                                                     // 1874
      return value;                                                                                                    // 1875
    });                                                                                                                // 1876
  }                                                                                                                    // 1877
}                                                                                                                      // 1878
                                                                                                                       //
function assertIsValidFieldName(key) {                                                                                 // 1880
  var match = void 0;                                                                                                  // 1881
                                                                                                                       //
  if (typeof key === 'string' && (match = key.match(/^\$|\.|\0/))) {                                                   // 1882
    throw MinimongoError("Key " + key + " must not " + invalidCharMsg[match[0]]);                                      // 1883
  }                                                                                                                    // 1884
} // for a.b.c.2.d.e, keyparts should be ['a', 'b', 'c', '2', 'd', 'e'],                                               // 1885
// and then you would operate on the 'e' property of the returned                                                      // 1888
// object.                                                                                                             // 1889
//                                                                                                                     // 1890
// if options.noCreate is falsey, creates intermediate levels of                                                       // 1891
// structure as necessary, like mkdir -p (and raises an exception if                                                   // 1892
// that would mean giving a non-numeric property to an array.) if                                                      // 1893
// options.noCreate is true, return undefined instead.                                                                 // 1894
//                                                                                                                     // 1895
// may modify the last element of keyparts to signal to the caller that it needs                                       // 1896
// to use a different value to index into the returned object (for example,                                            // 1897
// ['a', '01'] -> ['a', 1]).                                                                                           // 1898
//                                                                                                                     // 1899
// if forbidArray is true, return null if the keypath goes through an array.                                           // 1900
//                                                                                                                     // 1901
// if options.arrayIndices is set, use its first element for the (first) '$' in                                        // 1902
// the path.                                                                                                           // 1903
                                                                                                                       //
                                                                                                                       //
function findModTarget(doc, keyparts) {                                                                                // 1904
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                                // 1904
  var usedArrayIndex = false;                                                                                          // 1905
                                                                                                                       //
  for (var i = 0; i < keyparts.length; i++) {                                                                          // 1907
    var last = i === keyparts.length - 1;                                                                              // 1908
    var keypart = keyparts[i];                                                                                         // 1909
                                                                                                                       //
    if (!isIndexable(doc)) {                                                                                           // 1911
      if (options.noCreate) {                                                                                          // 1912
        return undefined;                                                                                              // 1913
      }                                                                                                                // 1914
                                                                                                                       //
      var error = MinimongoError("cannot use the part '" + keypart + "' to traverse " + doc);                          // 1916
      error.setPropertyError = true;                                                                                   // 1919
      throw error;                                                                                                     // 1920
    }                                                                                                                  // 1921
                                                                                                                       //
    if (doc instanceof Array) {                                                                                        // 1923
      if (options.forbidArray) {                                                                                       // 1924
        return null;                                                                                                   // 1925
      }                                                                                                                // 1926
                                                                                                                       //
      if (keypart === '$') {                                                                                           // 1928
        if (usedArrayIndex) {                                                                                          // 1929
          throw MinimongoError('Too many positional (i.e. \'$\') elements');                                           // 1930
        }                                                                                                              // 1931
                                                                                                                       //
        if (!options.arrayIndices || !options.arrayIndices.length) {                                                   // 1933
          throw MinimongoError('The positional operator did not find the match needed from the ' + 'query');           // 1934
        }                                                                                                              // 1938
                                                                                                                       //
        keypart = options.arrayIndices[0];                                                                             // 1940
        usedArrayIndex = true;                                                                                         // 1941
      } else if (isNumericKey(keypart)) {                                                                              // 1942
        keypart = parseInt(keypart);                                                                                   // 1943
      } else {                                                                                                         // 1944
        if (options.noCreate) {                                                                                        // 1945
          return undefined;                                                                                            // 1946
        }                                                                                                              // 1947
                                                                                                                       //
        throw MinimongoError("can't append to array using string field name [" + keypart + "]");                       // 1949
      }                                                                                                                // 1952
                                                                                                                       //
      if (last) {                                                                                                      // 1954
        keyparts[i] = keypart; // handle 'a.01'                                                                        // 1955
      }                                                                                                                // 1956
                                                                                                                       //
      if (options.noCreate && keypart >= doc.length) {                                                                 // 1958
        return undefined;                                                                                              // 1959
      }                                                                                                                // 1960
                                                                                                                       //
      while (doc.length < keypart) {                                                                                   // 1962
        doc.push(null);                                                                                                // 1963
      }                                                                                                                // 1964
                                                                                                                       //
      if (!last) {                                                                                                     // 1966
        if (doc.length === keypart) {                                                                                  // 1967
          doc.push({});                                                                                                // 1968
        } else if ((0, _typeof3.default)(doc[keypart]) !== 'object') {                                                 // 1969
          throw MinimongoError("can't modify field '" + keyparts[i + 1] + "' of list value " + JSON.stringify(doc[keypart]));
        }                                                                                                              // 1974
      }                                                                                                                // 1975
    } else {                                                                                                           // 1976
      assertIsValidFieldName(keypart);                                                                                 // 1977
                                                                                                                       //
      if (!(keypart in doc)) {                                                                                         // 1979
        if (options.noCreate) {                                                                                        // 1980
          return undefined;                                                                                            // 1981
        }                                                                                                              // 1982
                                                                                                                       //
        if (!last) {                                                                                                   // 1984
          doc[keypart] = {};                                                                                           // 1985
        }                                                                                                              // 1986
      }                                                                                                                // 1987
    }                                                                                                                  // 1988
                                                                                                                       //
    if (last) {                                                                                                        // 1990
      return doc;                                                                                                      // 1991
    }                                                                                                                  // 1992
                                                                                                                       //
    doc = doc[keypart];                                                                                                // 1994
  } // notreached                                                                                                      // 1995
                                                                                                                       //
}                                                                                                                      // 1998
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"matcher.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/matcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                                //
                                                                                                                       //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  "default": function () {                                                                                             // 1
    return Matcher;                                                                                                    // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
var LocalCollection = void 0;                                                                                          // 1
module.watch(require("./local_collection.js"), {                                                                       // 1
  "default": function (v) {                                                                                            // 1
    LocalCollection = v;                                                                                               // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var compileDocumentSelector = void 0,                                                                                  // 1
    hasOwn = void 0,                                                                                                   // 1
    nothingMatcher = void 0;                                                                                           // 1
module.watch(require("./common.js"), {                                                                                 // 1
  compileDocumentSelector: function (v) {                                                                              // 1
    compileDocumentSelector = v;                                                                                       // 1
  },                                                                                                                   // 1
  hasOwn: function (v) {                                                                                               // 1
    hasOwn = v;                                                                                                        // 1
  },                                                                                                                   // 1
  nothingMatcher: function (v) {                                                                                       // 1
    nothingMatcher = v;                                                                                                // 1
  }                                                                                                                    // 1
}, 1);                                                                                                                 // 1
                                                                                                                       //
var Matcher = function () {                                                                                            //
  function Matcher(selector, isUpdate) {                                                                               // 29
    (0, _classCallCheck3.default)(this, Matcher);                                                                      // 29
    // A set (object mapping string -> *) of all of the document paths looked                                          // 30
    // at by the selector. Also includes the empty string if it may look at any                                        // 31
    // path (eg, $where).                                                                                              // 32
    this._paths = {}; // Set to true if compilation finds a $near.                                                     // 33
                                                                                                                       //
    this._hasGeoQuery = false; // Set to true if compilation finds a $where.                                           // 35
                                                                                                                       //
    this._hasWhere = false; // Set to false if compilation finds anything other than a simple equality                 // 37
    // or one or more of '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin' used                                       // 39
    // with scalars as operands.                                                                                       // 40
                                                                                                                       //
    this._isSimple = true; // Set to a dummy document which always matches this Matcher. Or set to null                // 41
    // if such document is too hard to find.                                                                           // 43
                                                                                                                       //
    this._matchingDocument = undefined; // A clone of the original selector. It may just be a function if the user     // 44
    // passed in a function; otherwise is definitely an object (eg, IDs are                                            // 46
    // translated into {_id: ID} first. Used by canBecomeTrueByModifier and                                            // 47
    // Sorter._useWithMatcher.                                                                                         // 48
                                                                                                                       //
    this._selector = null;                                                                                             // 49
    this._docMatcher = this._compileSelector(selector); // Set to true if selection is done for an update operation    // 50
    // Default is false                                                                                                // 52
    // Used for $near array update (issue #3599)                                                                       // 53
                                                                                                                       //
    this._isUpdate = isUpdate;                                                                                         // 54
  }                                                                                                                    // 55
                                                                                                                       //
  Matcher.prototype.documentMatches = function () {                                                                    //
    function documentMatches(doc) {                                                                                    //
      if (doc !== Object(doc)) {                                                                                       // 58
        throw Error('documentMatches needs a document');                                                               // 59
      }                                                                                                                // 60
                                                                                                                       //
      return this._docMatcher(doc);                                                                                    // 62
    }                                                                                                                  // 63
                                                                                                                       //
    return documentMatches;                                                                                            //
  }();                                                                                                                 //
                                                                                                                       //
  Matcher.prototype.hasGeoQuery = function () {                                                                        //
    function hasGeoQuery() {                                                                                           //
      return this._hasGeoQuery;                                                                                        // 66
    }                                                                                                                  // 67
                                                                                                                       //
    return hasGeoQuery;                                                                                                //
  }();                                                                                                                 //
                                                                                                                       //
  Matcher.prototype.hasWhere = function () {                                                                           //
    function hasWhere() {                                                                                              //
      return this._hasWhere;                                                                                           // 70
    }                                                                                                                  // 71
                                                                                                                       //
    return hasWhere;                                                                                                   //
  }();                                                                                                                 //
                                                                                                                       //
  Matcher.prototype.isSimple = function () {                                                                           //
    function isSimple() {                                                                                              //
      return this._isSimple;                                                                                           // 74
    }                                                                                                                  // 75
                                                                                                                       //
    return isSimple;                                                                                                   //
  }(); // Given a selector, return a function that takes one argument, a                                               //
  // document. It returns a result object.                                                                             // 78
                                                                                                                       //
                                                                                                                       //
  Matcher.prototype._compileSelector = function () {                                                                   //
    function _compileSelector(selector) {                                                                              //
      // you can pass a literal function instead of a selector                                                         // 80
      if (selector instanceof Function) {                                                                              // 81
        this._isSimple = false;                                                                                        // 82
        this._selector = selector;                                                                                     // 83
                                                                                                                       //
        this._recordPathUsed('');                                                                                      // 84
                                                                                                                       //
        return function (doc) {                                                                                        // 86
          return {                                                                                                     // 86
            result: !!selector.call(doc)                                                                               // 86
          };                                                                                                           // 86
        };                                                                                                             // 86
      } // shorthand -- scalar _id                                                                                     // 87
                                                                                                                       //
                                                                                                                       //
      if (LocalCollection._selectorIsId(selector)) {                                                                   // 90
        this._selector = {                                                                                             // 91
          _id: selector                                                                                                // 91
        };                                                                                                             // 91
                                                                                                                       //
        this._recordPathUsed('_id');                                                                                   // 92
                                                                                                                       //
        return function (doc) {                                                                                        // 94
          return {                                                                                                     // 94
            result: EJSON.equals(doc._id, selector)                                                                    // 94
          };                                                                                                           // 94
        };                                                                                                             // 94
      } // protect against dangerous selectors.  falsey and {_id: falsey} are both                                     // 95
      // likely programmer error, and not what you want, particularly for                                              // 98
      // destructive operations.                                                                                       // 99
                                                                                                                       //
                                                                                                                       //
      if (!selector || hasOwn.call(selector, '_id') && !selector._id) {                                                // 100
        this._isSimple = false;                                                                                        // 101
        return nothingMatcher;                                                                                         // 102
      } // Top level can't be an array or true or binary.                                                              // 103
                                                                                                                       //
                                                                                                                       //
      if (Array.isArray(selector) || EJSON.isBinary(selector) || typeof selector === 'boolean') {                      // 106
        throw new Error("Invalid selector: " + selector);                                                              // 109
      }                                                                                                                // 110
                                                                                                                       //
      this._selector = EJSON.clone(selector);                                                                          // 112
      return compileDocumentSelector(selector, this, {                                                                 // 114
        isRoot: true                                                                                                   // 114
      });                                                                                                              // 114
    }                                                                                                                  // 115
                                                                                                                       //
    return _compileSelector;                                                                                           //
  }(); // Returns a list of key paths the given selector is looking for. It includes                                   //
  // the empty string if there is a $where.                                                                            // 118
                                                                                                                       //
                                                                                                                       //
  Matcher.prototype._getPaths = function () {                                                                          //
    function _getPaths() {                                                                                             //
      return Object.keys(this._paths);                                                                                 // 120
    }                                                                                                                  // 121
                                                                                                                       //
    return _getPaths;                                                                                                  //
  }();                                                                                                                 //
                                                                                                                       //
  Matcher.prototype._recordPathUsed = function () {                                                                    //
    function _recordPathUsed(path) {                                                                                   //
      this._paths[path] = true;                                                                                        // 124
    }                                                                                                                  // 125
                                                                                                                       //
    return _recordPathUsed;                                                                                            //
  }();                                                                                                                 //
                                                                                                                       //
  return Matcher;                                                                                                      //
}();                                                                                                                   //
                                                                                                                       //
// helpers used by compiled selector code                                                                              // 128
LocalCollection._f = {                                                                                                 // 129
  // XXX for _all and _in, consider building 'inquery' at compile time..                                               // 130
  _type: function (v) {                                                                                                // 131
    if (typeof v === 'number') {                                                                                       // 132
      return 1;                                                                                                        // 133
    }                                                                                                                  // 134
                                                                                                                       //
    if (typeof v === 'string') {                                                                                       // 136
      return 2;                                                                                                        // 137
    }                                                                                                                  // 138
                                                                                                                       //
    if (typeof v === 'boolean') {                                                                                      // 140
      return 8;                                                                                                        // 141
    }                                                                                                                  // 142
                                                                                                                       //
    if (Array.isArray(v)) {                                                                                            // 144
      return 4;                                                                                                        // 145
    }                                                                                                                  // 146
                                                                                                                       //
    if (v === null) {                                                                                                  // 148
      return 10;                                                                                                       // 149
    } // note that typeof(/x/) === "object"                                                                            // 150
                                                                                                                       //
                                                                                                                       //
    if (v instanceof RegExp) {                                                                                         // 153
      return 11;                                                                                                       // 154
    }                                                                                                                  // 155
                                                                                                                       //
    if (typeof v === 'function') {                                                                                     // 157
      return 13;                                                                                                       // 158
    }                                                                                                                  // 159
                                                                                                                       //
    if (v instanceof Date) {                                                                                           // 161
      return 9;                                                                                                        // 162
    }                                                                                                                  // 163
                                                                                                                       //
    if (EJSON.isBinary(v)) {                                                                                           // 165
      return 5;                                                                                                        // 166
    }                                                                                                                  // 167
                                                                                                                       //
    if (v instanceof MongoID.ObjectID) {                                                                               // 169
      return 7;                                                                                                        // 170
    } // object                                                                                                        // 171
                                                                                                                       //
                                                                                                                       //
    return 3; // XXX support some/all of these:                                                                        // 174
    // 14, symbol                                                                                                      // 177
    // 15, javascript code with scope                                                                                  // 178
    // 16, 18: 32-bit/64-bit integer                                                                                   // 179
    // 17, timestamp                                                                                                   // 180
    // 255, minkey                                                                                                     // 181
    // 127, maxkey                                                                                                     // 182
  },                                                                                                                   // 183
  // deep equality test: use for literal document and array matches                                                    // 185
  _equal: function (a, b) {                                                                                            // 186
    return EJSON.equals(a, b, {                                                                                        // 187
      keyOrderSensitive: true                                                                                          // 187
    });                                                                                                                // 187
  },                                                                                                                   // 188
  // maps a type code to a value that can be used to sort values of different                                          // 190
  // types                                                                                                             // 191
  _typeorder: function (t) {                                                                                           // 192
    // http://www.mongodb.org/display/DOCS/What+is+the+Compare+Order+for+BSON+Types                                    // 193
    // XXX what is the correct sort position for Javascript code?                                                      // 194
    // ('100' in the matrix below)                                                                                     // 195
    // XXX minkey/maxkey                                                                                               // 196
    return [-1, // (not a type)                                                                                        // 197
    1, // number                                                                                                       // 199
    2, // string                                                                                                       // 200
    3, // object                                                                                                       // 201
    4, // array                                                                                                        // 202
    5, // binary                                                                                                       // 203
    -1, // deprecated                                                                                                  // 204
    6, // ObjectID                                                                                                     // 205
    7, // bool                                                                                                         // 206
    8, // Date                                                                                                         // 207
    0, // null                                                                                                         // 208
    9, // RegExp                                                                                                       // 209
    -1, // deprecated                                                                                                  // 210
    100, // JS code                                                                                                    // 211
    2, // deprecated (symbol)                                                                                          // 212
    100, // JS code                                                                                                    // 213
    1, // 32-bit int                                                                                                   // 214
    8, // Mongo timestamp                                                                                              // 215
    1 // 64-bit int                                                                                                    // 216
    ][t];                                                                                                              // 197
  },                                                                                                                   // 218
  // compare two values of unknown type according to BSON ordering                                                     // 220
  // semantics. (as an extension, consider 'undefined' to be less than                                                 // 221
  // any other value.) return negative if a is less, positive if b is                                                  // 222
  // less, or 0 if equal                                                                                               // 223
  _cmp: function (a, b) {                                                                                              // 224
    if (a === undefined) {                                                                                             // 225
      return b === undefined ? 0 : -1;                                                                                 // 226
    }                                                                                                                  // 227
                                                                                                                       //
    if (b === undefined) {                                                                                             // 229
      return 1;                                                                                                        // 230
    }                                                                                                                  // 231
                                                                                                                       //
    var ta = LocalCollection._f._type(a);                                                                              // 233
                                                                                                                       //
    var tb = LocalCollection._f._type(b);                                                                              // 234
                                                                                                                       //
    var oa = LocalCollection._f._typeorder(ta);                                                                        // 236
                                                                                                                       //
    var ob = LocalCollection._f._typeorder(tb);                                                                        // 237
                                                                                                                       //
    if (oa !== ob) {                                                                                                   // 239
      return oa < ob ? -1 : 1;                                                                                         // 240
    } // XXX need to implement this if we implement Symbol or integers, or                                             // 241
    // Timestamp                                                                                                       // 244
                                                                                                                       //
                                                                                                                       //
    if (ta !== tb) {                                                                                                   // 245
      throw Error('Missing type coercion logic in _cmp');                                                              // 246
    }                                                                                                                  // 247
                                                                                                                       //
    if (ta === 7) {                                                                                                    // 249
      // ObjectID                                                                                                      // 249
      // Convert to string.                                                                                            // 250
      ta = tb = 2;                                                                                                     // 251
      a = a.toHexString();                                                                                             // 252
      b = b.toHexString();                                                                                             // 253
    }                                                                                                                  // 254
                                                                                                                       //
    if (ta === 9) {                                                                                                    // 256
      // Date                                                                                                          // 256
      // Convert to millis.                                                                                            // 257
      ta = tb = 1;                                                                                                     // 258
      a = a.getTime();                                                                                                 // 259
      b = b.getTime();                                                                                                 // 260
    }                                                                                                                  // 261
                                                                                                                       //
    if (ta === 1) // double                                                                                            // 263
      return a - b;                                                                                                    // 264
    if (tb === 2) // string                                                                                            // 266
      return a < b ? -1 : a === b ? 0 : 1;                                                                             // 267
                                                                                                                       //
    if (ta === 3) {                                                                                                    // 269
      // Object                                                                                                        // 269
      // this could be much more efficient in the expected case ...                                                    // 270
      var toArray = function (object) {                                                                                // 271
        var result = [];                                                                                               // 272
        Object.keys(object).forEach(function (key) {                                                                   // 274
          result.push(key, object[key]);                                                                               // 275
        });                                                                                                            // 276
        return result;                                                                                                 // 278
      };                                                                                                               // 279
                                                                                                                       //
      return LocalCollection._f._cmp(toArray(a), toArray(b));                                                          // 281
    }                                                                                                                  // 282
                                                                                                                       //
    if (ta === 4) {                                                                                                    // 284
      // Array                                                                                                         // 284
      for (var i = 0;; i++) {                                                                                          // 285
        if (i === a.length) {                                                                                          // 286
          return i === b.length ? 0 : -1;                                                                              // 287
        }                                                                                                              // 288
                                                                                                                       //
        if (i === b.length) {                                                                                          // 290
          return 1;                                                                                                    // 291
        }                                                                                                              // 292
                                                                                                                       //
        var s = LocalCollection._f._cmp(a[i], b[i]);                                                                   // 294
                                                                                                                       //
        if (s !== 0) {                                                                                                 // 295
          return s;                                                                                                    // 296
        }                                                                                                              // 297
      }                                                                                                                // 298
    }                                                                                                                  // 299
                                                                                                                       //
    if (ta === 5) {                                                                                                    // 301
      // binary                                                                                                        // 301
      // Surprisingly, a small binary blob is always less than a large one in                                          // 302
      // Mongo.                                                                                                        // 303
      if (a.length !== b.length) {                                                                                     // 304
        return a.length - b.length;                                                                                    // 305
      }                                                                                                                // 306
                                                                                                                       //
      for (var _i = 0; _i < a.length; _i++) {                                                                          // 308
        if (a[_i] < b[_i]) {                                                                                           // 309
          return -1;                                                                                                   // 310
        }                                                                                                              // 311
                                                                                                                       //
        if (a[_i] > b[_i]) {                                                                                           // 313
          return 1;                                                                                                    // 314
        }                                                                                                              // 315
      }                                                                                                                // 316
                                                                                                                       //
      return 0;                                                                                                        // 318
    }                                                                                                                  // 319
                                                                                                                       //
    if (ta === 8) {                                                                                                    // 321
      // boolean                                                                                                       // 321
      if (a) {                                                                                                         // 322
        return b ? 0 : 1;                                                                                              // 323
      }                                                                                                                // 324
                                                                                                                       //
      return b ? -1 : 0;                                                                                               // 326
    }                                                                                                                  // 327
                                                                                                                       //
    if (ta === 10) // null                                                                                             // 329
      return 0;                                                                                                        // 330
    if (ta === 11) // regexp                                                                                           // 332
      throw Error('Sorting not supported on regular expression'); // XXX                                               // 333
    // 13: javascript code                                                                                             // 335
    // 14: symbol                                                                                                      // 336
    // 15: javascript code with scope                                                                                  // 337
    // 16: 32-bit integer                                                                                              // 338
    // 17: timestamp                                                                                                   // 339
    // 18: 64-bit integer                                                                                              // 340
    // 255: minkey                                                                                                     // 341
    // 127: maxkey                                                                                                     // 342
                                                                                                                       //
    if (ta === 13) // javascript code                                                                                  // 343
      throw Error('Sorting not supported on Javascript code'); // XXX                                                  // 344
                                                                                                                       //
    throw Error('Unknown type to sort');                                                                               // 346
  }                                                                                                                    // 347
};                                                                                                                     // 129
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"minimongo_common.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_common.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var LocalCollection_ = void 0;                                                                                         // 1
module.watch(require("./local_collection.js"), {                                                                       // 1
    "default": function (v) {                                                                                          // 1
        LocalCollection_ = v;                                                                                          // 1
    }                                                                                                                  // 1
}, 0);                                                                                                                 // 1
var Matcher = void 0;                                                                                                  // 1
module.watch(require("./matcher.js"), {                                                                                // 1
    "default": function (v) {                                                                                          // 1
        Matcher = v;                                                                                                   // 1
    }                                                                                                                  // 1
}, 1);                                                                                                                 // 1
var Sorter = void 0;                                                                                                   // 1
module.watch(require("./sorter.js"), {                                                                                 // 1
    "default": function (v) {                                                                                          // 1
        Sorter = v;                                                                                                    // 1
    }                                                                                                                  // 1
}, 2);                                                                                                                 // 1
LocalCollection = LocalCollection_;                                                                                    // 5
Minimongo = {                                                                                                          // 6
    LocalCollection: LocalCollection_,                                                                                 // 7
    Matcher: Matcher,                                                                                                  // 8
    Sorter: Sorter                                                                                                     // 9
};                                                                                                                     // 6
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_handle.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/observe_handle.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                                //
                                                                                                                       //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  "default": function () {                                                                                             // 1
    return ObserveHandle;                                                                                              // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
                                                                                                                       //
var ObserveHandle = function () {                                                                                      //
  function ObserveHandle() {                                                                                           //
    (0, _classCallCheck3.default)(this, ObserveHandle);                                                                //
  }                                                                                                                    //
                                                                                                                       //
  return ObserveHandle;                                                                                                //
}();                                                                                                                   //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sorter.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/sorter.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                                //
                                                                                                                       //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                       //
                                                                                                                       //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                                //
                                                                                                                       //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  "default": function () {                                                                                             // 1
    return Sorter;                                                                                                     // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
var ELEMENT_OPERATORS = void 0,                                                                                        // 1
    equalityElementMatcher = void 0,                                                                                   // 1
    expandArraysInBranches = void 0,                                                                                   // 1
    hasOwn = void 0,                                                                                                   // 1
    isOperatorObject = void 0,                                                                                         // 1
    makeLookupFunction = void 0,                                                                                       // 1
    regexpElementMatcher = void 0;                                                                                     // 1
module.watch(require("./common.js"), {                                                                                 // 1
  ELEMENT_OPERATORS: function (v) {                                                                                    // 1
    ELEMENT_OPERATORS = v;                                                                                             // 1
  },                                                                                                                   // 1
  equalityElementMatcher: function (v) {                                                                               // 1
    equalityElementMatcher = v;                                                                                        // 1
  },                                                                                                                   // 1
  expandArraysInBranches: function (v) {                                                                               // 1
    expandArraysInBranches = v;                                                                                        // 1
  },                                                                                                                   // 1
  hasOwn: function (v) {                                                                                               // 1
    hasOwn = v;                                                                                                        // 1
  },                                                                                                                   // 1
  isOperatorObject: function (v) {                                                                                     // 1
    isOperatorObject = v;                                                                                              // 1
  },                                                                                                                   // 1
  makeLookupFunction: function (v) {                                                                                   // 1
    makeLookupFunction = v;                                                                                            // 1
  },                                                                                                                   // 1
  regexpElementMatcher: function (v) {                                                                                 // 1
    regexpElementMatcher = v;                                                                                          // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
                                                                                                                       //
var Sorter = function () {                                                                                             //
  function Sorter(spec) {                                                                                              // 25
    var _this = this;                                                                                                  // 25
                                                                                                                       //
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                              // 25
    (0, _classCallCheck3.default)(this, Sorter);                                                                       // 25
    this._sortSpecParts = [];                                                                                          // 26
    this._sortFunction = null;                                                                                         // 27
                                                                                                                       //
    var addSpecPart = function (path, ascending) {                                                                     // 29
      if (!path) {                                                                                                     // 30
        throw Error('sort keys must be non-empty');                                                                    // 31
      }                                                                                                                // 32
                                                                                                                       //
      if (path.charAt(0) === '$') {                                                                                    // 34
        throw Error("unsupported sort key: " + path);                                                                  // 35
      }                                                                                                                // 36
                                                                                                                       //
      _this._sortSpecParts.push({                                                                                      // 38
        ascending: ascending,                                                                                          // 39
        lookup: makeLookupFunction(path, {                                                                             // 40
          forSort: true                                                                                                // 40
        }),                                                                                                            // 40
        path: path                                                                                                     // 41
      });                                                                                                              // 38
    };                                                                                                                 // 43
                                                                                                                       //
    if (spec instanceof Array) {                                                                                       // 45
      spec.forEach(function (element) {                                                                                // 46
        if (typeof element === 'string') {                                                                             // 47
          addSpecPart(element, true);                                                                                  // 48
        } else {                                                                                                       // 49
          addSpecPart(element[0], element[1] !== 'desc');                                                              // 50
        }                                                                                                              // 51
      });                                                                                                              // 52
    } else if ((typeof spec === "undefined" ? "undefined" : (0, _typeof3.default)(spec)) === 'object') {               // 53
      Object.keys(spec).forEach(function (key) {                                                                       // 54
        addSpecPart(key, spec[key] >= 0);                                                                              // 55
      });                                                                                                              // 56
    } else if (typeof spec === 'function') {                                                                           // 57
      this._sortFunction = spec;                                                                                       // 58
    } else {                                                                                                           // 59
      throw Error("Bad sort specification: " + JSON.stringify(spec));                                                  // 60
    } // If a function is specified for sorting, we skip the rest.                                                     // 61
                                                                                                                       //
                                                                                                                       //
    if (this._sortFunction) {                                                                                          // 64
      return;                                                                                                          // 65
    } // To implement affectedByModifier, we piggy-back on top of Matcher's                                            // 66
    // affectedByModifier code; we create a selector that is affected by the                                           // 69
    // same modifiers as this sort order. This is only implemented on the                                              // 70
    // server.                                                                                                         // 71
                                                                                                                       //
                                                                                                                       //
    if (this.affectedByModifier) {                                                                                     // 72
      var selector = {};                                                                                               // 73
                                                                                                                       //
      this._sortSpecParts.forEach(function (spec) {                                                                    // 75
        selector[spec.path] = 1;                                                                                       // 76
      });                                                                                                              // 77
                                                                                                                       //
      this._selectorForAffectedByModifier = new Minimongo.Matcher(selector);                                           // 79
    }                                                                                                                  // 80
                                                                                                                       //
    this._keyComparator = composeComparators(this._sortSpecParts.map(function (spec, i) {                              // 82
      return _this._keyFieldComparator(i);                                                                             // 83
    })); // If you specify a matcher for this Sorter, _keyFilter may be set to a                                       // 83
    // function which selects whether or not a given "sort key" (tuple of values                                       // 87
    // for the different sort spec fields) is compatible with the selector.                                            // 88
                                                                                                                       //
    this._keyFilter = null;                                                                                            // 89
                                                                                                                       //
    if (options.matcher) {                                                                                             // 91
      this._useWithMatcher(options.matcher);                                                                           // 92
    }                                                                                                                  // 93
  }                                                                                                                    // 94
                                                                                                                       //
  Sorter.prototype.getComparator = function () {                                                                       //
    function getComparator(options) {                                                                                  //
      // If sort is specified or have no distances, just use the comparator from                                       // 97
      // the source specification (which defaults to "everything is equal".                                            // 98
      // issue #3599                                                                                                   // 99
      // https://docs.mongodb.com/manual/reference/operator/query/near/#sort-operation                                 // 100
      // sort effectively overrides $near                                                                              // 101
      if (this._sortSpecParts.length || !options || !options.distances) {                                              // 102
        return this._getBaseComparator();                                                                              // 103
      }                                                                                                                // 104
                                                                                                                       //
      var distances = options.distances; // Return a comparator which compares using $near distances.                  // 106
                                                                                                                       //
      return function (a, b) {                                                                                         // 109
        if (!distances.has(a._id)) {                                                                                   // 110
          throw Error("Missing distance for " + a._id);                                                                // 111
        }                                                                                                              // 112
                                                                                                                       //
        if (!distances.has(b._id)) {                                                                                   // 114
          throw Error("Missing distance for " + b._id);                                                                // 115
        }                                                                                                              // 116
                                                                                                                       //
        return distances.get(a._id) - distances.get(b._id);                                                            // 118
      };                                                                                                               // 119
    }                                                                                                                  // 120
                                                                                                                       //
    return getComparator;                                                                                              //
  }(); // Takes in two keys: arrays whose lengths match the number of spec                                             //
  // parts. Returns negative, 0, or positive based on using the sort spec to                                           // 123
  // compare fields.                                                                                                   // 124
                                                                                                                       //
                                                                                                                       //
  Sorter.prototype._compareKeys = function () {                                                                        //
    function _compareKeys(key1, key2) {                                                                                //
      if (key1.length !== this._sortSpecParts.length || key2.length !== this._sortSpecParts.length) {                  // 126
        throw Error('Key has wrong length');                                                                           // 128
      }                                                                                                                // 129
                                                                                                                       //
      return this._keyComparator(key1, key2);                                                                          // 131
    }                                                                                                                  // 132
                                                                                                                       //
    return _compareKeys;                                                                                               //
  }(); // Iterates over each possible "key" from doc (ie, over each branch), calling                                   //
  // 'cb' with the key.                                                                                                // 135
                                                                                                                       //
                                                                                                                       //
  Sorter.prototype._generateKeysFromDoc = function () {                                                                //
    function _generateKeysFromDoc(doc, cb) {                                                                           //
      if (this._sortSpecParts.length === 0) {                                                                          // 137
        throw new Error('can\'t generate keys without a spec');                                                        // 138
      }                                                                                                                // 139
                                                                                                                       //
      var pathFromIndices = function (indices) {                                                                       // 141
        return indices.join(',') + ",";                                                                                // 141
      };                                                                                                               // 141
                                                                                                                       //
      var knownPaths = null; // maps index -> ({'' -> value} or {path -> value})                                       // 143
                                                                                                                       //
      var valuesByIndexAndPath = this._sortSpecParts.map(function (spec) {                                             // 146
        // Expand any leaf arrays that we find, and ignore those arrays                                                // 147
        // themselves.  (We never sort based on an array itself.)                                                      // 148
        var branches = expandArraysInBranches(spec.lookup(doc), true); // If there are no values for a key (eg, key goes to an empty array),
        // pretend we found one null value.                                                                            // 152
                                                                                                                       //
        if (!branches.length) {                                                                                        // 153
          branches = [{                                                                                                // 154
            value: null                                                                                                // 154
          }];                                                                                                          // 154
        }                                                                                                              // 155
                                                                                                                       //
        var element = Object.create(null);                                                                             // 157
        var usedPaths = false;                                                                                         // 158
        branches.forEach(function (branch) {                                                                           // 160
          if (!branch.arrayIndices) {                                                                                  // 161
            // If there are no array indices for a branch, then it must be the                                         // 162
            // only branch, because the only thing that produces multiple branches                                     // 163
            // is the use of arrays.                                                                                   // 164
            if (branches.length > 1) {                                                                                 // 165
              throw Error('multiple branches but no array used?');                                                     // 166
            }                                                                                                          // 167
                                                                                                                       //
            element[''] = branch.value;                                                                                // 169
            return;                                                                                                    // 170
          }                                                                                                            // 171
                                                                                                                       //
          usedPaths = true;                                                                                            // 173
          var path = pathFromIndices(branch.arrayIndices);                                                             // 175
                                                                                                                       //
          if (hasOwn.call(element, path)) {                                                                            // 177
            throw Error("duplicate path: " + path);                                                                    // 178
          }                                                                                                            // 179
                                                                                                                       //
          element[path] = branch.value; // If two sort fields both go into arrays, they have to go into the            // 181
          // exact same arrays and we have to find the same paths.  This is                                            // 184
          // roughly the same condition that makes MongoDB throw this strange                                          // 185
          // error message.  eg, the main thing is that if sort spec is {a: 1,                                         // 186
          // b:1} then a and b cannot both be arrays.                                                                  // 187
          //                                                                                                           // 188
          // (In MongoDB it seems to be OK to have {a: 1, 'a.x.y': 1} where 'a'                                        // 189
          // and 'a.x.y' are both arrays, but we don't allow this for now.                                             // 190
          // #NestedArraySort                                                                                          // 191
          // XXX achieve full compatibility here                                                                       // 192
                                                                                                                       //
          if (knownPaths && !hasOwn.call(knownPaths, path)) {                                                          // 193
            throw Error('cannot index parallel arrays');                                                               // 194
          }                                                                                                            // 195
        });                                                                                                            // 196
                                                                                                                       //
        if (knownPaths) {                                                                                              // 198
          // Similarly to above, paths must match everywhere, unless this is a                                         // 199
          // non-array field.                                                                                          // 200
          if (!hasOwn.call(element, '') && Object.keys(knownPaths).length !== Object.keys(element).length) {           // 201
            throw Error('cannot index parallel arrays!');                                                              // 203
          }                                                                                                            // 204
        } else if (usedPaths) {                                                                                        // 205
          knownPaths = {};                                                                                             // 206
          Object.keys(element).forEach(function (path) {                                                               // 208
            knownPaths[path] = true;                                                                                   // 209
          });                                                                                                          // 210
        }                                                                                                              // 211
                                                                                                                       //
        return element;                                                                                                // 213
      });                                                                                                              // 214
                                                                                                                       //
      if (!knownPaths) {                                                                                               // 216
        // Easy case: no use of arrays.                                                                                // 217
        var soleKey = valuesByIndexAndPath.map(function (values) {                                                     // 218
          if (!hasOwn.call(values, '')) {                                                                              // 219
            throw Error('no value in sole key case?');                                                                 // 220
          }                                                                                                            // 221
                                                                                                                       //
          return values[''];                                                                                           // 223
        });                                                                                                            // 224
        cb(soleKey);                                                                                                   // 226
        return;                                                                                                        // 228
      }                                                                                                                // 229
                                                                                                                       //
      Object.keys(knownPaths).forEach(function (path) {                                                                // 231
        var key = valuesByIndexAndPath.map(function (values) {                                                         // 232
          if (hasOwn.call(values, '')) {                                                                               // 233
            return values[''];                                                                                         // 234
          }                                                                                                            // 235
                                                                                                                       //
          if (!hasOwn.call(values, path)) {                                                                            // 237
            throw Error('missing path?');                                                                              // 238
          }                                                                                                            // 239
                                                                                                                       //
          return values[path];                                                                                         // 241
        });                                                                                                            // 242
        cb(key);                                                                                                       // 244
      });                                                                                                              // 245
    }                                                                                                                  // 246
                                                                                                                       //
    return _generateKeysFromDoc;                                                                                       //
  }(); // Returns a comparator that represents the sort specification (but not                                         //
  // including a possible geoquery distance tie-breaker).                                                              // 249
                                                                                                                       //
                                                                                                                       //
  Sorter.prototype._getBaseComparator = function () {                                                                  //
    function _getBaseComparator() {                                                                                    //
      var _this2 = this;                                                                                               // 250
                                                                                                                       //
      if (this._sortFunction) {                                                                                        // 251
        return this._sortFunction;                                                                                     // 252
      } // If we're only sorting on geoquery distance and no specs, just say                                           // 253
      // everything is equal.                                                                                          // 256
                                                                                                                       //
                                                                                                                       //
      if (!this._sortSpecParts.length) {                                                                               // 257
        return function (doc1, doc2) {                                                                                 // 258
          return 0;                                                                                                    // 258
        };                                                                                                             // 258
      }                                                                                                                // 259
                                                                                                                       //
      return function (doc1, doc2) {                                                                                   // 261
        var key1 = _this2._getMinKeyFromDoc(doc1);                                                                     // 262
                                                                                                                       //
        var key2 = _this2._getMinKeyFromDoc(doc2);                                                                     // 263
                                                                                                                       //
        return _this2._compareKeys(key1, key2);                                                                        // 264
      };                                                                                                               // 265
    }                                                                                                                  // 266
                                                                                                                       //
    return _getBaseComparator;                                                                                         //
  }(); // Finds the minimum key from the doc, according to the sort specs.  (We say                                    //
  // "minimum" here but this is with respect to the sort spec, so "descending"                                         // 269
  // sort fields mean we're finding the max for that field.)                                                           // 270
  //                                                                                                                   // 271
  // Note that this is NOT "find the minimum value of the first field, the                                             // 272
  // minimum value of the second field, etc"... it's "choose the                                                       // 273
  // lexicographically minimum value of the key vector, allowing only keys which                                       // 274
  // you can find along the same paths".  ie, for a doc {a: [{x: 0, y: 5}, {x:                                         // 275
  // 1, y: 3}]} with sort spec {'a.x': 1, 'a.y': 1}, the only keys are [0,5] and                                       // 276
  // [1,3], and the minimum key is [0,5]; notably, [0,3] is NOT a key.                                                 // 277
                                                                                                                       //
                                                                                                                       //
  Sorter.prototype._getMinKeyFromDoc = function () {                                                                   //
    function _getMinKeyFromDoc(doc) {                                                                                  //
      var _this3 = this;                                                                                               // 278
                                                                                                                       //
      var minKey = null;                                                                                               // 279
                                                                                                                       //
      this._generateKeysFromDoc(doc, function (key) {                                                                  // 281
        if (!_this3._keyCompatibleWithSelector(key)) {                                                                 // 282
          return;                                                                                                      // 283
        }                                                                                                              // 284
                                                                                                                       //
        if (minKey === null) {                                                                                         // 286
          minKey = key;                                                                                                // 287
          return;                                                                                                      // 288
        }                                                                                                              // 289
                                                                                                                       //
        if (_this3._compareKeys(key, minKey) < 0) {                                                                    // 291
          minKey = key;                                                                                                // 292
        }                                                                                                              // 293
      }); // This could happen if our key filter somehow filters out all the keys even                                 // 294
      // though somehow the selector matches.                                                                          // 297
                                                                                                                       //
                                                                                                                       //
      if (minKey === null) {                                                                                           // 298
        throw Error('sort selector found no keys in doc?');                                                            // 299
      }                                                                                                                // 300
                                                                                                                       //
      return minKey;                                                                                                   // 302
    }                                                                                                                  // 303
                                                                                                                       //
    return _getMinKeyFromDoc;                                                                                          //
  }();                                                                                                                 //
                                                                                                                       //
  Sorter.prototype._getPaths = function () {                                                                           //
    function _getPaths() {                                                                                             //
      return this._sortSpecParts.map(function (part) {                                                                 // 306
        return part.path;                                                                                              // 306
      });                                                                                                              // 306
    }                                                                                                                  // 307
                                                                                                                       //
    return _getPaths;                                                                                                  //
  }();                                                                                                                 //
                                                                                                                       //
  Sorter.prototype._keyCompatibleWithSelector = function () {                                                          //
    function _keyCompatibleWithSelector(key) {                                                                         //
      return !this._keyFilter || this._keyFilter(key);                                                                 // 310
    }                                                                                                                  // 311
                                                                                                                       //
    return _keyCompatibleWithSelector;                                                                                 //
  }(); // Given an index 'i', returns a comparator that compares two key arrays based                                  //
  // on field 'i'.                                                                                                     // 314
                                                                                                                       //
                                                                                                                       //
  Sorter.prototype._keyFieldComparator = function () {                                                                 //
    function _keyFieldComparator(i) {                                                                                  //
      var invert = !this._sortSpecParts[i].ascending;                                                                  // 316
      return function (key1, key2) {                                                                                   // 318
        var compare = LocalCollection._f._cmp(key1[i], key2[i]);                                                       // 319
                                                                                                                       //
        return invert ? -compare : compare;                                                                            // 320
      };                                                                                                               // 321
    }                                                                                                                  // 322
                                                                                                                       //
    return _keyFieldComparator;                                                                                        //
  }(); // In MongoDB, if you have documents                                                                            //
  //    {_id: 'x', a: [1, 10]} and                                                                                     // 325
  //    {_id: 'y', a: [5, 15]},                                                                                        // 326
  // then C.find({}, {sort: {a: 1}}) puts x before y (1 comes before 5).                                               // 327
  // But  C.find({a: {$gt: 3}}, {sort: {a: 1}}) puts y before x (1 does not                                            // 328
  // match the selector, and 5 comes before 10).                                                                       // 329
  //                                                                                                                   // 330
  // The way this works is pretty subtle!  For example, if the documents                                               // 331
  // are instead {_id: 'x', a: [{x: 1}, {x: 10}]}) and                                                                 // 332
  //             {_id: 'y', a: [{x: 5}, {x: 15}]}),                                                                    // 333
  // then C.find({'a.x': {$gt: 3}}, {sort: {'a.x': 1}}) and                                                            // 334
  //      C.find({a: {$elemMatch: {x: {$gt: 3}}}}, {sort: {'a.x': 1}})                                                 // 335
  // both follow this rule (y before x).  (ie, you do have to apply this                                               // 336
  // through $elemMatch.)                                                                                              // 337
  //                                                                                                                   // 338
  // So if you pass a matcher to this sorter's constructor, we will attempt to                                         // 339
  // skip sort keys that don't match the selector. The logic here is pretty                                            // 340
  // subtle and undocumented; we've gotten as close as we can figure out based                                         // 341
  // on our understanding of Mongo's behavior.                                                                         // 342
                                                                                                                       //
                                                                                                                       //
  Sorter.prototype._useWithMatcher = function () {                                                                     //
    function _useWithMatcher(matcher) {                                                                                //
      var _this4 = this;                                                                                               // 343
                                                                                                                       //
      if (this._keyFilter) {                                                                                           // 344
        throw Error('called _useWithMatcher twice?');                                                                  // 345
      } // If we are only sorting by distance, then we're not going to bother to                                       // 346
      // build a key filter.                                                                                           // 349
      // XXX figure out how geoqueries interact with this stuff                                                        // 350
                                                                                                                       //
                                                                                                                       //
      if (!this._sortSpecParts.length) {                                                                               // 351
        return;                                                                                                        // 352
      }                                                                                                                // 353
                                                                                                                       //
      var selector = matcher._selector; // If the user just passed a falsey selector to find(),                        // 355
      // then we can't get a key filter from it.                                                                       // 358
                                                                                                                       //
      if (!selector) {                                                                                                 // 359
        return;                                                                                                        // 360
      } // If the user just passed a literal function to find(), then we can't get a                                   // 361
      // key filter from it.                                                                                           // 364
                                                                                                                       //
                                                                                                                       //
      if (selector instanceof Function) {                                                                              // 365
        return;                                                                                                        // 366
      }                                                                                                                // 367
                                                                                                                       //
      var constraintsByPath = {};                                                                                      // 369
                                                                                                                       //
      this._sortSpecParts.forEach(function (spec) {                                                                    // 371
        constraintsByPath[spec.path] = [];                                                                             // 372
      });                                                                                                              // 373
                                                                                                                       //
      Object.keys(selector).forEach(function (key) {                                                                   // 375
        var subSelector = selector[key]; // XXX support $and and $or                                                   // 376
                                                                                                                       //
        var constraints = constraintsByPath[key];                                                                      // 379
                                                                                                                       //
        if (!constraints) {                                                                                            // 380
          return;                                                                                                      // 381
        } // XXX it looks like the real MongoDB implementation isn't "does the                                         // 382
        // regexp match" but "does the value fall into a range named by the                                            // 385
        // literal prefix of the regexp", ie "foo" in /^foo(bar|baz)+/  But                                            // 386
        // "does the regexp match" is a good approximation.                                                            // 387
                                                                                                                       //
                                                                                                                       //
        if (subSelector instanceof RegExp) {                                                                           // 388
          // As far as we can tell, using either of the options that both we and                                       // 389
          // MongoDB support ('i' and 'm') disables use of the key filter. This                                        // 390
          // makes sense: MongoDB mostly appears to be calculating ranges of an                                        // 391
          // index to use, which means it only cares about regexps that match                                          // 392
          // one range (with a literal prefix), and both 'i' and 'm' prevent the                                       // 393
          // literal prefix of the regexp from actually meaning one range.                                             // 394
          if (subSelector.ignoreCase || subSelector.multiline) {                                                       // 395
            return;                                                                                                    // 396
          }                                                                                                            // 397
                                                                                                                       //
          constraints.push(regexpElementMatcher(subSelector));                                                         // 399
          return;                                                                                                      // 400
        }                                                                                                              // 401
                                                                                                                       //
        if (isOperatorObject(subSelector)) {                                                                           // 403
          Object.keys(subSelector).forEach(function (operator) {                                                       // 404
            var operand = subSelector[operator];                                                                       // 405
                                                                                                                       //
            if (['$lt', '$lte', '$gt', '$gte'].includes(operator)) {                                                   // 407
              // XXX this depends on us knowing that these operators don't use any                                     // 408
              // of the arguments to compileElementSelector other than operand.                                        // 409
              constraints.push(ELEMENT_OPERATORS[operator].compileElementSelector(operand));                           // 410
            } // See comments in the RegExp block above.                                                               // 413
                                                                                                                       //
                                                                                                                       //
            if (operator === '$regex' && !subSelector.$options) {                                                      // 416
              constraints.push(ELEMENT_OPERATORS.$regex.compileElementSelector(operand, subSelector));                 // 417
            } // XXX support {$exists: true}, $mod, $type, $in, $elemMatch                                             // 423
                                                                                                                       //
          });                                                                                                          // 426
          return;                                                                                                      // 428
        } // OK, it's an equality thing.                                                                               // 429
                                                                                                                       //
                                                                                                                       //
        constraints.push(equalityElementMatcher(subSelector));                                                         // 432
      }); // It appears that the first sort field is treated differently from the                                      // 433
      // others; we shouldn't create a key filter unless the first sort field is                                       // 436
      // restricted, though after that point we can restrict the other sort fields                                     // 437
      // or not as we wish.                                                                                            // 438
                                                                                                                       //
      if (!constraintsByPath[this._sortSpecParts[0].path].length) {                                                    // 439
        return;                                                                                                        // 440
      }                                                                                                                // 441
                                                                                                                       //
      this._keyFilter = function (key) {                                                                               // 443
        return _this4._sortSpecParts.every(function (specPart, index) {                                                // 443
          return constraintsByPath[specPart.path].every(function (fn) {                                                // 444
            return fn(key[index]);                                                                                     // 445
          });                                                                                                          // 445
        });                                                                                                            // 444
      };                                                                                                               // 443
    }                                                                                                                  // 448
                                                                                                                       //
    return _useWithMatcher;                                                                                            //
  }();                                                                                                                 //
                                                                                                                       //
  return Sorter;                                                                                                       //
}();                                                                                                                   //
                                                                                                                       //
// Given an array of comparators                                                                                       // 451
// (functions (a,b)->(negative or positive or zero)), returns a single                                                 // 452
// comparator which uses each comparator in order and returns the first                                                // 453
// non-zero value.                                                                                                     // 454
function composeComparators(comparatorArray) {                                                                         // 455
  return function (a, b) {                                                                                             // 456
    for (var i = 0; i < comparatorArray.length; ++i) {                                                                 // 457
      var compare = comparatorArray[i](a, b);                                                                          // 458
                                                                                                                       //
      if (compare !== 0) {                                                                                             // 459
        return compare;                                                                                                // 460
      }                                                                                                                // 461
    }                                                                                                                  // 462
                                                                                                                       //
    return 0;                                                                                                          // 464
  };                                                                                                                   // 465
}                                                                                                                      // 466
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/minimongo/minimongo_client.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.minimongo = exports, {
  LocalCollection: LocalCollection,
  Minimongo: Minimongo,
  MinimongoTest: MinimongoTest,
  MinimongoError: MinimongoError
});

})();
