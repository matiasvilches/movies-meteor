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
var OAuth = Package.oauth.OAuth;
var Oauth = Package.oauth.Oauth;
var Random = Package.random.Random;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;

/* Package-scope variables */
var Github;

(function(){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// packages/github-oauth/github_client.js                                                       //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
Github = {};                                                                                    // 1
                                                                                                // 2
// Request Github credentials for the user                                                      // 3
// @param options {optional}                                                                    // 4
// @param credentialRequestCompleteCallback {Function} Callback function to call on             // 5
//   completion. Takes one argument, credentialToken on success, or Error on                    // 6
//   error.                                                                                     // 7
Github.requestCredential = function (options, credentialRequestCompleteCallback) {              // 8
  // support both (options, callback) and (callback).                                           // 9
  if (!credentialRequestCompleteCallback && typeof options === 'function') {                    // 10
    credentialRequestCompleteCallback = options;                                                // 11
    options = {};                                                                               // 12
  }                                                                                             // 13
                                                                                                // 14
  var config = ServiceConfiguration.configurations.findOne({service: 'github'});                // 15
  if (!config) {                                                                                // 16
    credentialRequestCompleteCallback && credentialRequestCompleteCallback(                     // 17
      new ServiceConfiguration.ConfigError());                                                  // 18
    return;                                                                                     // 19
  }                                                                                             // 20
  var credentialToken = Random.secret();                                                        // 21
                                                                                                // 22
  var scope = (options && options.requestPermissions) || ['user:email'];                        // 23
  var flatScope = _.map(scope, encodeURIComponent).join('+');                                   // 24
                                                                                                // 25
  var loginStyle = OAuth._loginStyle('github', config, options);                                // 26
                                                                                                // 27
  var loginUrl =                                                                                // 28
    'https://github.com/login/oauth/authorize' +                                                // 29
    '?client_id=' + config.clientId +                                                           // 30
    '&scope=' + flatScope +                                                                     // 31
    '&redirect_uri=' + OAuth._redirectUri('github', config) +                                   // 32
    '&state=' + OAuth._stateParam(loginStyle, credentialToken, options && options.redirectUrl);
                                                                                                // 34
  OAuth.launchLogin({                                                                           // 35
    loginService: "github",                                                                     // 36
    loginStyle: loginStyle,                                                                     // 37
    loginUrl: loginUrl,                                                                         // 38
    credentialRequestCompleteCallback: credentialRequestCompleteCallback,                       // 39
    credentialToken: credentialToken,                                                           // 40
    popupOptions: {width: 900, height: 450}                                                     // 41
  });                                                                                           // 42
};                                                                                              // 43
                                                                                                // 44
//////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['github-oauth'] = {}, {
  Github: Github
});

})();
