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

/* Package-scope variables */
var makeInstaller, makeInstallerOptions, meteorInstall;

///////////////////////////////////////////////////////////////////////////////
//                                                                           //
// packages/modules-runtime/.npm/package/node_modules/install/install.js     //
// This file is in bare mode and is not in its own closure.                  //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////
                                                                             //
makeInstaller = function (options) {                                         // 1
  "use strict";                                                              // 2
                                                                             // 3
  options = options || {};                                                   // 4
                                                                             // 5
  // These file extensions will be appended to required module identifiers   // 6
  // if they do not exactly match an installed module.                       // 7
  var defaultExtensions = options.extensions || [".js", ".json"];            // 8
                                                                             // 9
  // If defined, the options.onInstall function will be called any time      // 10
  // new modules are installed.                                              // 11
  var onInstall = options.onInstall;                                         // 12
                                                                             // 13
  // If defined, each module-specific require function will be passed to     // 14
  // this function, along with the module object of the parent module, and   // 15
  // the result will be used in place of the original require function.      // 16
  var wrapRequire = options.wrapRequire;                                     // 17
                                                                             // 18
  // If defined, the options.override function will be called before         // 19
  // looking up any top-level package identifiers in node_modules            // 20
  // directories. It can either return a string to provide an alternate      // 21
  // package identifier, or a non-string value to prevent the lookup from    // 22
  // proceeding.                                                             // 23
  var override = options.override;                                           // 24
                                                                             // 25
  // If defined, the options.fallback function will be called when no        // 26
  // installed module is found for a required module identifier. Often       // 27
  // options.fallback will be implemented in terms of the native Node        // 28
  // require function, which has the ability to load binary modules.         // 29
  var fallback = options.fallback;                                           // 30
                                                                             // 31
  // List of fields to look for in package.json files to determine the       // 32
  // main entry module of the package. The first field listed here whose     // 33
  // value is a string will be used to resolve the entry module.             // 34
  var mainFields = options.mainFields ||                                     // 35
    // If options.mainFields is absent and options.browser is truthy,        // 36
    // package resolution will prefer the "browser" field of package.json    // 37
    // files to the "main" field. Note that this only supports               // 38
    // string-valued "browser" fields for now, though in the future it       // 39
    // might make sense to support the object version, a la browserify.      // 40
    (options.browser ? ["browser", "main"] : ["main"]);                      // 41
                                                                             // 42
  var hasOwn = {}.hasOwnProperty;                                            // 43
  function strictHasOwn(obj, key) {                                          // 44
    return isObject(obj) && isString(key) && hasOwn.call(obj, key);          // 45
  }                                                                          // 46
                                                                             // 47
  // Cache for looking up File objects given absolute module identifiers.    // 48
  // Invariants:                                                             // 49
  //   filesByModuleId[module.id] === fileAppendId(root, module.id)          // 50
  //   filesByModuleId[module.id].module === module                          // 51
  var filesByModuleId = {};                                                  // 52
                                                                             // 53
  // The file object representing the root directory of the installed        // 54
  // module tree.                                                            // 55
  var root = new File("/", new File("/.."));                                 // 56
  var rootRequire = makeRequire(root);                                       // 57
                                                                             // 58
  // Merges the given tree of directories and module factory functions       // 59
  // into the tree of installed modules and returns a require function       // 60
  // that behaves as if called from a module in the root directory.          // 61
  function install(tree, options) {                                          // 62
    if (isObject(tree)) {                                                    // 63
      fileMergeContents(root, tree, options);                                // 64
      if (isFunction(onInstall)) {                                           // 65
        onInstall(rootRequire);                                              // 66
      }                                                                      // 67
    }                                                                        // 68
    return rootRequire;                                                      // 69
  }                                                                          // 70
                                                                             // 71
  // Replace this function to enable Module.prototype.prefetch.              // 72
  install.fetch = function (ids) {                                           // 73
    throw new Error("fetch not implemented");                                // 74
  };                                                                         // 75
                                                                             // 76
  // This constructor will be used to instantiate the module objects         // 77
  // passed to module factory functions (i.e. the third argument after       // 78
  // require and exports), and is exposed as install.Module in case the      // 79
  // caller of makeInstaller wishes to modify Module.prototype.              // 80
  function Module(id) {                                                      // 81
    this.id = id;                                                            // 82
                                                                             // 83
    // The Node implementation of module.children unfortunately includes     // 84
    // only those child modules that were imported for the first time by     // 85
    // this parent module (i.e., child.parent === this).                     // 86
    this.children = [];                                                      // 87
                                                                             // 88
    // This object is an install.js extension that includes all child        // 89
    // modules imported by this module, even if this module is not the       // 90
    // first to import them.                                                 // 91
    this.childrenById = {};                                                  // 92
  }                                                                          // 93
                                                                             // 94
  Module.prototype.resolve = function (id) {                                 // 95
    return this.require.resolve(id);                                         // 96
  };                                                                         // 97
                                                                             // 98
  // Used to keep module.prefetch promise resolutions well-ordered.          // 99
  var lastPrefetchPromise;                                                   // 100
                                                                             // 101
  // May be shared by multiple sequential calls to module.prefetch.          // 102
  // Initialized to {} only when necessary.                                  // 103
  var missing;                                                               // 104
                                                                             // 105
  Module.prototype.prefetch = function (id) {                                // 106
    var module = this;                                                       // 107
    var parentFile = getOwn(filesByModuleId, module.id);                     // 108
                                                                             // 109
    lastPrefetchPromise = lastPrefetchPromise || Promise.resolve();          // 110
    var previousPromise = lastPrefetchPromise;                               // 111
                                                                             // 112
    function walk(module) {                                                  // 113
      var file = getOwn(filesByModuleId, module.id);                         // 114
      if (fileIsDynamic(file) && ! file.pending) {                           // 115
        file.pending = true;                                                 // 116
        missing = missing || {};                                             // 117
                                                                             // 118
        // These are the data that will be exposed to the install.fetch      // 119
        // callback, so it's worth documenting each item with a comment.     // 120
        missing[module.id] = {                                               // 121
          // The CommonJS module object that will be exposed to this         // 122
          // dynamic module when it is evaluated. Note that install.fetch    // 123
          // could decide to populate module.exports directly, instead of    // 124
          // fetching anything. In that case, install.fetch should omit      // 125
          // this module from the tree that it produces.                     // 126
          module: file.module,                                               // 127
          // List of module identifier strings imported by this module.      // 128
          // Note that the missing object already contains all available     // 129
          // dependencies (including transitive dependencies), so            // 130
          // install.fetch should not need to traverse these dependencies    // 131
          // in most cases; however, they may be useful for other reasons.   // 132
          // Though the strings are unique, note that two different          // 133
          // strings could resolve to the same module.                       // 134
          deps: Object.keys(file.deps),                                      // 135
          // The options (if any) that were passed as the second argument    // 136
          // to the install(tree, options) function when this stub was       // 137
          // first registered. Typically contains options.extensions, but    // 138
          // could contain any information appropriate for the entire tree   // 139
          // as originally installed. These options will be automatically    // 140
          // inherited by the newly fetched modules, so install.fetch        // 141
          // should not need to modify them.                                 // 142
          options: file.options,                                             // 143
          // Any stub data included in the array notation from the           // 144
          // original entry for this dynamic module. Typically contains      // 145
          // "main" and/or "browser" fields for package.json files, and is   // 146
          // otherwise undefined.                                            // 147
          stub: file.stub                                                    // 148
        };                                                                   // 149
                                                                             // 150
        each(file.deps, function (parentId, id) {                            // 151
          fileResolve(file, id);                                             // 152
        });                                                                  // 153
                                                                             // 154
        each(module.childrenById, walk);                                     // 155
      }                                                                      // 156
    }                                                                        // 157
                                                                             // 158
    return lastPrefetchPromise = new Promise(function (resolve) {            // 159
      var absChildId = module.resolve(id);                                   // 160
      each(module.childrenById, walk);                                       // 161
      resolve(absChildId);                                                   // 162
                                                                             // 163
    }).then(function (absChildId) {                                          // 164
      // Grab the current missing object and fetch its contents.             // 165
      var toBeFetched = missing;                                             // 166
      missing = null;                                                        // 167
                                                                             // 168
      return Promise.resolve(                                                // 169
        // The install.fetch function takes an object mapping missing        // 170
        // dynamic module identifiers to options objects, and should         // 171
        // return a Promise that resolves to a module tree that can be       // 172
        // installed. As an optimization, if there were no missing dynamic   // 173
        // modules, then we can skip calling install.fetch entirely.         // 174
        toBeFetched && install.fetch(toBeFetched)                            // 175
                                                                             // 176
      ).then(function (tree) {                                               // 177
        function both() {                                                    // 178
          install(tree);                                                     // 179
          return absChildId;                                                 // 180
        }                                                                    // 181
                                                                             // 182
        // Although we want multiple install.fetch calls to run in           // 183
        // parallel, it is important that the promises returned by           // 184
        // module.prefetch are resolved in the same order as the original    // 185
        // calls to module.prefetch, because previous fetches may include    // 186
        // modules assumed to exist by more recent module.prefetch calls.    // 187
        // Whether previousPromise was resolved or rejected, carry on with   // 188
        // the installation regardless.                                      // 189
        return previousPromise.then(both, both);                             // 190
      });                                                                    // 191
    });                                                                      // 192
  };                                                                         // 193
                                                                             // 194
  install.Module = Module;                                                   // 195
                                                                             // 196
  function getOwn(obj, key) {                                                // 197
    return strictHasOwn(obj, key) && obj[key];                               // 198
  }                                                                          // 199
                                                                             // 200
  function isObject(value) {                                                 // 201
    return value !== null && typeof value === "object";                      // 202
  }                                                                          // 203
                                                                             // 204
  function isFunction(value) {                                               // 205
    return typeof value === "function";                                      // 206
  }                                                                          // 207
                                                                             // 208
  function isString(value) {                                                 // 209
    return typeof value === "string";                                        // 210
  }                                                                          // 211
                                                                             // 212
  function makeMissingError(id) {                                            // 213
    return new Error("Cannot find module '" + id + "'");                     // 214
  }                                                                          // 215
                                                                             // 216
  function makeRequire(file) {                                               // 217
    function require(id) {                                                   // 218
      var result = fileResolve(file, id);                                    // 219
      if (result) {                                                          // 220
        return fileEvaluate(result, file.module);                            // 221
      }                                                                      // 222
                                                                             // 223
      var error = makeMissingError(id);                                      // 224
                                                                             // 225
      if (isFunction(fallback)) {                                            // 226
        return fallback(                                                     // 227
          id, // The missing module identifier.                              // 228
          file.module.id, // The path of the requiring file.                 // 229
          error // The error we would have thrown.                           // 230
        );                                                                   // 231
      }                                                                      // 232
                                                                             // 233
      throw error;                                                           // 234
    }                                                                        // 235
                                                                             // 236
    if (isFunction(wrapRequire)) {                                           // 237
      require = wrapRequire(require, file.module);                           // 238
    }                                                                        // 239
                                                                             // 240
    require.extensions = fileGetExtensions(file).slice(0);                   // 241
                                                                             // 242
    require.resolve = function (id) {                                        // 243
      var f = fileResolve(file, id);                                         // 244
      if (f) return f.module.id;                                             // 245
      var error = makeMissingError(id);                                      // 246
      if (fallback && isFunction(fallback.resolve)) {                        // 247
        return fallback.resolve(id, file.module.id, error);                  // 248
      }                                                                      // 249
      throw error;                                                           // 250
    };                                                                       // 251
                                                                             // 252
    return require;                                                          // 253
  }                                                                          // 254
                                                                             // 255
  // File objects represent either directories or modules that have been     // 256
  // installed. When a `File` respresents a directory, its `.contents`       // 257
  // property is an object containing the names of the files (or             // 258
  // directories) that it contains. When a `File` represents a module, its   // 259
  // `.contents` property is a function that can be invoked with the         // 260
  // appropriate `(require, exports, module)` arguments to evaluate the      // 261
  // module. If the `.contents` property is a string, that string will be    // 262
  // resolved as a module identifier, and the exports of the resulting       // 263
  // module will provide the exports of the original file. The `.parent`     // 264
  // property of a File is either a directory `File` or `null`. Note that    // 265
  // a child may claim another `File` as its parent even if the parent       // 266
  // does not have an entry for that child in its `.contents` object.        // 267
  // This is important for implementing anonymous files, and preventing      // 268
  // child modules from using `../relative/identifier` syntax to examine     // 269
  // unrelated modules.                                                      // 270
  function File(moduleId, parent) {                                          // 271
    var file = this;                                                         // 272
                                                                             // 273
    // Link to the parent file.                                              // 274
    file.parent = parent = parent || null;                                   // 275
                                                                             // 276
    // The module object for this File, which will eventually boast an       // 277
    // .exports property when/if the file is evaluated.                      // 278
    file.module = new Module(moduleId);                                      // 279
    filesByModuleId[moduleId] = file;                                        // 280
                                                                             // 281
    // The .contents of the file can be either (1) an object, if the file    // 282
    // represents a directory containing other files; (2) a factory          // 283
    // function, if the file represents a module that can be imported; (3)   // 284
    // a string, if the file is an alias for another file; or (4) null, if   // 285
    // the file's contents are not (yet) available.                          // 286
    file.contents = null;                                                    // 287
                                                                             // 288
    // Set of module identifiers imported by this module. Note that this     // 289
    // set is not necessarily complete, so don't rely on it unless you       // 290
    // know what you're doing.                                               // 291
    file.deps = {};                                                          // 292
  }                                                                          // 293
                                                                             // 294
  function fileEvaluate(file, parentModule) {                                // 295
    var module = file.module;                                                // 296
    if (! strictHasOwn(module, "exports")) {                                 // 297
      var contents = file.contents;                                          // 298
      if (! contents) {                                                      // 299
        // If this file was installed with array notation, and the array     // 300
        // contained one or more objects but no functions, then the combined
        // properties of the objects are treated as a temporary stub for     // 302
        // file.module.exports. This is particularly important for partial   // 303
        // package.json modules, so that the resolution logic can know the   // 304
        // value of the "main" and/or "browser" fields, at least, even if    // 305
        // the rest of the package.json file is not (yet) available.         // 306
        if (file.stub) {                                                     // 307
          return file.stub;                                                  // 308
        }                                                                    // 309
                                                                             // 310
        throw makeMissingError(module.id);                                   // 311
      }                                                                      // 312
                                                                             // 313
      if (parentModule) {                                                    // 314
        module.parent = parentModule;                                        // 315
        var children = parentModule.children;                                // 316
        if (Array.isArray(children)) {                                       // 317
          children.push(module);                                             // 318
        }                                                                    // 319
      }                                                                      // 320
                                                                             // 321
      // If a Module.prototype.useNode method is defined, give it a chance   // 322
      // to define module.exports based on module.id using Node.             // 323
      if (! isFunction(module.useNode) ||                                    // 324
          ! module.useNode()) {                                              // 325
        contents(                                                            // 326
          module.require = module.require || makeRequire(file),              // 327
          // If the file had a .stub, reuse the same object for exports.     // 328
          module.exports = file.stub || {},                                  // 329
          module,                                                            // 330
          file.module.id,                                                    // 331
          file.parent.module.id                                              // 332
        );                                                                   // 333
      }                                                                      // 334
                                                                             // 335
      module.loaded = true;                                                  // 336
    }                                                                        // 337
                                                                             // 338
    // The module.runModuleSetters method will be deprecated in favor of     // 339
    // just module.runSetters: https://github.com/benjamn/reify/pull/160     // 340
    var runSetters = module.runSetters || module.runModuleSetters;           // 341
    if (isFunction(runSetters)) {                                            // 342
      runSetters.call(module);                                               // 343
    }                                                                        // 344
                                                                             // 345
    return module.exports;                                                   // 346
  }                                                                          // 347
                                                                             // 348
  function fileIsDirectory(file) {                                           // 349
    return file && isObject(file.contents);                                  // 350
  }                                                                          // 351
                                                                             // 352
  function fileIsDynamic(file) {                                             // 353
    return file && file.contents === null;                                   // 354
  }                                                                          // 355
                                                                             // 356
  function fileMergeContents(file, contents, options) {                      // 357
    if (Array.isArray(contents)) {                                           // 358
      contents.forEach(function (item) {                                     // 359
        if (isString(item)) {                                                // 360
          file.deps[item] = file.module.id;                                  // 361
        } else if (isFunction(item)) {                                       // 362
          contents = item;                                                   // 363
        } else if (isObject(item)) {                                         // 364
          file.stub = file.stub || {};                                       // 365
          each(item, function (value, key) {                                 // 366
            file.stub[key] = value;                                          // 367
          });                                                                // 368
        }                                                                    // 369
      });                                                                    // 370
                                                                             // 371
      if (! isFunction(contents)) {                                          // 372
        // If the array did not contain a function, merge nothing.           // 373
        contents = null;                                                     // 374
      }                                                                      // 375
                                                                             // 376
    } else if (! isFunction(contents) &&                                     // 377
               ! isString(contents) &&                                       // 378
               ! isObject(contents)) {                                       // 379
      // If contents is neither an array nor a function nor a string nor     // 380
      // an object, just give up and merge nothing.                          // 381
      contents = null;                                                       // 382
    }                                                                        // 383
                                                                             // 384
    if (contents) {                                                          // 385
      file.contents = file.contents || (isObject(contents) ? {} : contents);
      if (isObject(contents) && fileIsDirectory(file)) {                     // 387
        each(contents, function (value, key) {                               // 388
          if (key === "..") {                                                // 389
            child = file.parent;                                             // 390
                                                                             // 391
          } else {                                                           // 392
            var child = getOwn(file.contents, key);                          // 393
                                                                             // 394
            if (! child) {                                                   // 395
              child = file.contents[key] = new File(                         // 396
                file.module.id.replace(/\/*$/, "/") + key,                   // 397
                file                                                         // 398
              );                                                             // 399
                                                                             // 400
              child.options = options;                                       // 401
            }                                                                // 402
          }                                                                  // 403
                                                                             // 404
          fileMergeContents(child, value, options);                          // 405
        });                                                                  // 406
      }                                                                      // 407
    }                                                                        // 408
  }                                                                          // 409
                                                                             // 410
  function each(obj, callback, context) {                                    // 411
    Object.keys(obj).forEach(function (key) {                                // 412
      callback.call(this, obj[key], key);                                    // 413
    }, context);                                                             // 414
  }                                                                          // 415
                                                                             // 416
  function fileGetExtensions(file) {                                         // 417
    return file.options                                                      // 418
      && file.options.extensions                                             // 419
      || defaultExtensions;                                                  // 420
  }                                                                          // 421
                                                                             // 422
  function fileAppendIdPart(file, part, extensions) {                        // 423
    // Always append relative to a directory.                                // 424
    while (file && ! fileIsDirectory(file)) {                                // 425
      file = file.parent;                                                    // 426
    }                                                                        // 427
                                                                             // 428
    if (! file || ! part || part === ".") {                                  // 429
      return file;                                                           // 430
    }                                                                        // 431
                                                                             // 432
    if (part === "..") {                                                     // 433
      return file.parent;                                                    // 434
    }                                                                        // 435
                                                                             // 436
    var exactChild = getOwn(file.contents, part);                            // 437
                                                                             // 438
    // Only consider multiple file extensions if this part is the last       // 439
    // part of a module identifier and not equal to `.` or `..`, and there   // 440
    // was no exact match or the exact match was a directory.                // 441
    if (extensions && (! exactChild || fileIsDirectory(exactChild))) {       // 442
      for (var e = 0; e < extensions.length; ++e) {                          // 443
        var child = getOwn(file.contents, part + extensions[e]);             // 444
        if (child && ! fileIsDirectory(child)) {                             // 445
          return child;                                                      // 446
        }                                                                    // 447
      }                                                                      // 448
    }                                                                        // 449
                                                                             // 450
    return exactChild;                                                       // 451
  }                                                                          // 452
                                                                             // 453
  function fileAppendId(file, id, extensions) {                              // 454
    var parts = id.split("/");                                               // 455
                                                                             // 456
    // Use `Array.prototype.every` to terminate iteration early if           // 457
    // `fileAppendIdPart` returns a falsy value.                             // 458
    parts.every(function (part, i) {                                         // 459
      return file = i < parts.length - 1                                     // 460
        ? fileAppendIdPart(file, part)                                       // 461
        : fileAppendIdPart(file, part, extensions);                          // 462
    });                                                                      // 463
                                                                             // 464
    return file;                                                             // 465
  }                                                                          // 466
                                                                             // 467
  function recordChild(parentModule, childFile) {                            // 468
    var childModule = childFile && childFile.module;                         // 469
    if (parentModule && childModule) {                                       // 470
      parentModule.childrenById[childModule.id] = childModule;               // 471
    }                                                                        // 472
  }                                                                          // 473
                                                                             // 474
  function fileResolve(file, id, parentModule, seenDirFiles) {               // 475
    var parentModule = parentModule || file.module;                          // 476
    var extensions = fileGetExtensions(file);                                // 477
                                                                             // 478
    file =                                                                   // 479
      // Absolute module identifiers (i.e. those that begin with a `/`       // 480
      // character) are interpreted relative to the root directory, which    // 481
      // is a slight deviation from Node, which has access to the entire     // 482
      // file system.                                                        // 483
      id.charAt(0) === "/" ? fileAppendId(root, id, extensions) :            // 484
      // Relative module identifiers are interpreted relative to the         // 485
      // current file, naturally.                                            // 486
      id.charAt(0) === "." ? fileAppendId(file, id, extensions) :            // 487
      // Top-level module identifiers are interpreted as referring to        // 488
      // packages in `node_modules` directories.                             // 489
      nodeModulesLookup(file, id, extensions);                               // 490
                                                                             // 491
    // If the identifier resolves to a directory, we use the same logic as   // 492
    // Node to find an `index.js` or `package.json` file to evaluate.        // 493
    while (fileIsDirectory(file)) {                                          // 494
      seenDirFiles = seenDirFiles || [];                                     // 495
                                                                             // 496
      // If the "main" field of a `package.json` file resolves to a          // 497
      // directory we've already considered, then we should not attempt to   // 498
      // read the same `package.json` file again. Using an array as a set    // 499
      // is acceptable here because the number of directories to consider    // 500
      // is rarely greater than 1 or 2. Also, using indexOf allows us to     // 501
      // store File objects instead of strings.                              // 502
      if (seenDirFiles.indexOf(file) < 0) {                                  // 503
        seenDirFiles.push(file);                                             // 504
                                                                             // 505
        var pkgJsonFile = fileAppendIdPart(file, "package.json"), main;      // 506
        var pkg = pkgJsonFile && fileEvaluate(pkgJsonFile, parentModule);    // 507
        if (pkg &&                                                           // 508
            mainFields.some(function (name) {                                // 509
              return isString(main = pkg[name]);                             // 510
            })) {                                                            // 511
          // The "main" field of package.json does not have to begin with    // 512
          // ./ to be considered relative, so first we try simply            // 513
          // appending it to the directory path before falling back to a     // 514
          // full fileResolve, which might return a package from a           // 515
          // node_modules directory.                                         // 516
          var mainFile = fileAppendId(file, main, extensions) ||             // 517
            fileResolve(file, main, parentModule, seenDirFiles);             // 518
                                                                             // 519
          if (mainFile) {                                                    // 520
            file = mainFile;                                                 // 521
            recordChild(parentModule, pkgJsonFile);                          // 522
            // The fileAppendId call above may have returned a directory,    // 523
            // so continue the loop to make sure we resolve it to a          // 524
            // non-directory file.                                           // 525
            continue;                                                        // 526
          }                                                                  // 527
        }                                                                    // 528
      }                                                                      // 529
                                                                             // 530
      // If we didn't find a `package.json` file, or it didn't have a        // 531
      // resolvable `.main` property, the only possibility left to           // 532
      // consider is that this directory contains an `index.js` module.      // 533
      // This assignment almost always terminates the while loop, because    // 534
      // there's very little chance `fileIsDirectory(file)` will be true     // 535
      // for the result of `fileAppendIdPart(file, "index.js")`. However,    // 536
      // in principle it is remotely possible that a file called             // 537
      // `index.js` could be a directory instead of a file.                  // 538
      file = fileAppendIdPart(file, "index.js");                             // 539
    }                                                                        // 540
                                                                             // 541
    if (file && isString(file.contents)) {                                   // 542
      file = fileResolve(file, file.contents, parentModule, seenDirFiles);   // 543
    }                                                                        // 544
                                                                             // 545
    recordChild(parentModule, file);                                         // 546
                                                                             // 547
    return file;                                                             // 548
  };                                                                         // 549
                                                                             // 550
  function nodeModulesLookup(file, id, extensions) {                         // 551
    if (isFunction(override)) {                                              // 552
      id = override(id, file.module.id);                                     // 553
    }                                                                        // 554
                                                                             // 555
    if (isString(id)) {                                                      // 556
      for (var resolved; file && ! resolved; file = file.parent) {           // 557
        resolved = fileIsDirectory(file) &&                                  // 558
          fileAppendId(file, "node_modules/" + id, extensions);              // 559
      }                                                                      // 560
                                                                             // 561
      return resolved;                                                       // 562
    }                                                                        // 563
  }                                                                          // 564
                                                                             // 565
  return install;                                                            // 566
};                                                                           // 567
                                                                             // 568
if (typeof exports === "object") {                                           // 569
  exports.makeInstaller = makeInstaller;                                     // 570
}                                                                            // 571
                                                                             // 572
///////////////////////////////////////////////////////////////////////////////







(function(){

///////////////////////////////////////////////////////////////////////////////
//                                                                           //
// packages/modules-runtime/options.js                                       //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////
                                                                             //
makeInstallerOptions = {};                                                   // 1
                                                                             // 2
if (typeof Profile === "function" &&                                         // 3
    process.env.METEOR_PROFILE) {                                            // 4
  makeInstallerOptions.wrapRequire = function (require) {                    // 5
    return Profile(function (id) {                                           // 6
      return "require(" + JSON.stringify(id) + ")";                          // 7
    }, require);                                                             // 8
  };                                                                         // 9
}                                                                            // 10
                                                                             // 11
///////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

///////////////////////////////////////////////////////////////////////////////
//                                                                           //
// packages/modules-runtime/client.js                                        //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////
                                                                             //
// On the client, make package resolution prefer the "browser" field of      // 1
// package.json files to the "main" field.                                   // 2
makeInstallerOptions.browser = true;                                         // 3
                                                                             // 4
meteorInstall = makeInstaller(makeInstallerOptions);                         // 5
                                                                             // 6
///////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['modules-runtime'] = {}, {
  meteorInstall: meteorInstall
});

})();
