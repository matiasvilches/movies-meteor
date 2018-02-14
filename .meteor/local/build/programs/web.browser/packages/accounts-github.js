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
var Accounts = Package['accounts-base'].Accounts;
var Github = Package['github-oauth'].Github;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var Symbol = Package['ecmascript-runtime-client'].Symbol;
var Map = Package['ecmascript-runtime-client'].Map;
var Set = Package['ecmascript-runtime-client'].Set;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-github":{"notice.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/accounts-github/notice.js                                                                             //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
if (Package['accounts-ui'] && !Package['service-configuration'] && !Package.hasOwnProperty('github-config-ui')) {
  console.warn("Note: You're using accounts-ui and accounts-github,\n" + "but didn't install the configuration UI for the GitHub\n" + "OAuth. You can install it with:\n" + "\n" + "    meteor add github-config-ui" + "\n");
}                                                                                                                 // 12
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"github.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/accounts-github/github.js                                                                             //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Accounts.oauth.registerService('github');                                                                         // 1
                                                                                                                  //
if (Meteor.isClient) {                                                                                            // 3
  var loginWithGithub = function (options, callback) {                                                            // 4
    // support a callback without options                                                                         // 5
    if (!callback && typeof options === "function") {                                                             // 6
      callback = options;                                                                                         // 7
      options = null;                                                                                             // 8
    }                                                                                                             // 9
                                                                                                                  //
    var credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);            // 11
    Github.requestCredential(options, credentialRequestCompleteCallback);                                         // 12
  };                                                                                                              // 13
                                                                                                                  //
  Accounts.registerClientLoginFunction('github', loginWithGithub);                                                // 14
                                                                                                                  //
  Meteor.loginWithGithub = function () {                                                                          // 15
    return Accounts.applyLoginFunction('github', arguments);                                                      // 16
  };                                                                                                              // 17
} else {                                                                                                          // 18
  Accounts.addAutopublishFields({                                                                                 // 19
    // not sure whether the github api can be used from the browser,                                              // 20
    // thus not sure if we should be sending access tokens; but we do it                                          // 21
    // for all other oauth2 providers, and it may come in handy.                                                  // 22
    forLoggedInUser: ['services.github'],                                                                         // 23
    forOtherUsers: ['services.github.username']                                                                   // 24
  });                                                                                                             // 19
}                                                                                                                 // 26
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./node_modules/meteor/accounts-github/notice.js");
require("./node_modules/meteor/accounts-github/github.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-github'] = {};

})();
