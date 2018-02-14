(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var OAuth = Package.oauth.OAuth;
var Oauth = Package.oauth.Oauth;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Google;

var require = meteorInstall({"node_modules":{"meteor":{"google-oauth":{"google_server.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/google-oauth/google_server.js                                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var _extends2 = require("babel-runtime/helpers/extends");

var _extends3 = _interopRequireDefault(_extends2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Google = require("./namespace.js");

var Accounts = require("meteor/accounts-base").Accounts;

var hasOwn = Object.prototype.hasOwnProperty; // https://developers.google.com/accounts/docs/OAuth2Login#userinfocall

Google.whitelistedFields = ['id', 'email', 'verified_email', 'name', 'given_name', 'family_name', 'picture', 'locale', 'timezone', 'gender'];

function getServiceDataFromTokens(tokens) {
  var accessToken = tokens.accessToken;
  var idToken = tokens.idToken;
  var scopes = getScopes(accessToken);
  var identity = getIdentity(accessToken);
  var serviceData = {
    accessToken: accessToken,
    idToken: idToken,
    scope: scopes
  };

  if (hasOwn.call(tokens, "expiresIn")) {
    serviceData.expiresAt = Date.now() + 1000 * parseInt(tokens.expiresIn, 10);
  }

  var fields = Object.create(null);
  Google.whitelistedFields.forEach(function (name) {
    if (hasOwn.call(identity, name)) {
      fields[name] = identity[name];
    }
  });
  Object.assign(serviceData, fields); // only set the token in serviceData if it's there. this ensures
  // that we don't lose old ones (since we only get this on the first
  // log in attempt)

  if (tokens.refreshToken) {
    serviceData.refreshToken = tokens.refreshToken;
  }

  return {
    serviceData: serviceData,
    options: {
      profile: {
        name: identity.name
      }
    }
  };
}

Accounts.registerLoginHandler(function (request) {
  if (request.googleSignIn !== true) {
    return;
  }

  const tokens = {
    accessToken: request.accessToken,
    refreshToken: request.refreshToken,
    idToken: request.idToken
  };

  if (request.serverAuthCode) {
    Object.assign(tokens, getTokens({
      code: request.serverAuthCode
    }));
  }

  const result = getServiceDataFromTokens(tokens);
  return Accounts.updateOrCreateUserFromExternalService("google", (0, _extends3.default)({
    id: request.userId,
    idToken: request.idToken,
    accessToken: request.accessToken,
    email: request.email,
    picture: request.imageUrl
  }, result.serviceData), result.options);
});

function getServiceData(query) {
  return getServiceDataFromTokens(getTokens(query));
}

OAuth.registerService('google', 2, null, getServiceData); // returns an object containing:
// - accessToken
// - expiresIn: lifetime of token in seconds
// - refreshToken, if this is the first authorization request

var getTokens = function (query) {
  var config = ServiceConfiguration.configurations.findOne({
    service: 'google'
  });
  if (!config) throw new ServiceConfiguration.ConfigError();
  var response;

  try {
    response = HTTP.post("https://accounts.google.com/o/oauth2/token", {
      params: {
        code: query.code,
        client_id: config.clientId,
        client_secret: OAuth.openSecret(config.secret),
        redirect_uri: OAuth._redirectUri('google', config),
        grant_type: 'authorization_code'
      }
    });
  } catch (err) {
    throw Object.assign(new Error("Failed to complete OAuth handshake with Google. " + err.message), {
      response: err.response
    });
  }

  if (response.data.error) {
    // if the http response was a json object with an error attribute
    throw new Error("Failed to complete OAuth handshake with Google. " + response.data.error);
  } else {
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      idToken: response.data.id_token
    };
  }
};

var getIdentity = function (accessToken) {
  try {
    return HTTP.get("https://www.googleapis.com/oauth2/v1/userinfo", {
      params: {
        access_token: accessToken
      }
    }).data;
  } catch (err) {
    throw Object.assign(new Error("Failed to fetch identity from Google. " + err.message), {
      response: err.response
    });
  }
};

var getScopes = function (accessToken) {
  try {
    return HTTP.get("https://www.googleapis.com/oauth2/v1/tokeninfo", {
      params: {
        access_token: accessToken
      }
    }).data.scope.split(' ');
  } catch (err) {
    throw Object.assign(new Error("Failed to fetch tokeninfo from Google. " + err.message), {
      response: err.response
    });
  }
};

Google.retrieveCredential = function (credentialToken, credentialSecret) {
  return OAuth.retrieveCredential(credentialToken, credentialSecret);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"namespace.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/google-oauth/namespace.js                                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// The module.exports object of this module becomes the Google namespace
// for other modules in this package.
Google = module.exports; // So that api.export finds the "Google" property.

Google.Google = Google;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./node_modules/meteor/google-oauth/google_server.js");
var exports = require("./node_modules/meteor/google-oauth/namespace.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['google-oauth'] = exports, {
  Google: Google
});

})();

//# sourceURL=meteor://💻app/packages/google-oauth.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZ29vZ2xlLW9hdXRoL2dvb2dsZV9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2dvb2dsZS1vYXV0aC9uYW1lc3BhY2UuanMiXSwibmFtZXMiOlsiR29vZ2xlIiwicmVxdWlyZSIsIkFjY291bnRzIiwiaGFzT3duIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJ3aGl0ZWxpc3RlZEZpZWxkcyIsImdldFNlcnZpY2VEYXRhRnJvbVRva2VucyIsInRva2VucyIsImFjY2Vzc1Rva2VuIiwiaWRUb2tlbiIsInNjb3BlcyIsImdldFNjb3BlcyIsImlkZW50aXR5IiwiZ2V0SWRlbnRpdHkiLCJzZXJ2aWNlRGF0YSIsInNjb3BlIiwiY2FsbCIsImV4cGlyZXNBdCIsIkRhdGUiLCJub3ciLCJwYXJzZUludCIsImV4cGlyZXNJbiIsImZpZWxkcyIsImNyZWF0ZSIsImZvckVhY2giLCJuYW1lIiwiYXNzaWduIiwicmVmcmVzaFRva2VuIiwib3B0aW9ucyIsInByb2ZpbGUiLCJyZWdpc3RlckxvZ2luSGFuZGxlciIsInJlcXVlc3QiLCJnb29nbGVTaWduSW4iLCJzZXJ2ZXJBdXRoQ29kZSIsImdldFRva2VucyIsImNvZGUiLCJyZXN1bHQiLCJ1cGRhdGVPckNyZWF0ZVVzZXJGcm9tRXh0ZXJuYWxTZXJ2aWNlIiwiaWQiLCJ1c2VySWQiLCJlbWFpbCIsInBpY3R1cmUiLCJpbWFnZVVybCIsImdldFNlcnZpY2VEYXRhIiwicXVlcnkiLCJPQXV0aCIsInJlZ2lzdGVyU2VydmljZSIsImNvbmZpZyIsIlNlcnZpY2VDb25maWd1cmF0aW9uIiwiY29uZmlndXJhdGlvbnMiLCJmaW5kT25lIiwic2VydmljZSIsIkNvbmZpZ0Vycm9yIiwicmVzcG9uc2UiLCJIVFRQIiwicG9zdCIsInBhcmFtcyIsImNsaWVudF9pZCIsImNsaWVudElkIiwiY2xpZW50X3NlY3JldCIsIm9wZW5TZWNyZXQiLCJzZWNyZXQiLCJyZWRpcmVjdF91cmkiLCJfcmVkaXJlY3RVcmkiLCJncmFudF90eXBlIiwiZXJyIiwiRXJyb3IiLCJtZXNzYWdlIiwiZGF0YSIsImVycm9yIiwiYWNjZXNzX3Rva2VuIiwicmVmcmVzaF90b2tlbiIsImV4cGlyZXNfaW4iLCJpZF90b2tlbiIsImdldCIsInNwbGl0IiwicmV0cmlldmVDcmVkZW50aWFsIiwiY3JlZGVudGlhbFRva2VuIiwiY3JlZGVudGlhbFNlY3JldCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLFNBQVNDLFFBQVEsZ0JBQVIsQ0FBYjs7QUFDQSxJQUFJQyxXQUFXRCxRQUFRLHNCQUFSLEVBQWdDQyxRQUEvQzs7QUFDQSxJQUFJQyxTQUFTQyxPQUFPQyxTQUFQLENBQWlCQyxjQUE5QixDLENBRUE7O0FBQ0FOLE9BQU9PLGlCQUFQLEdBQTJCLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsZ0JBQWhCLEVBQWtDLE1BQWxDLEVBQTBDLFlBQTFDLEVBQ1IsYUFEUSxFQUNPLFNBRFAsRUFDa0IsUUFEbEIsRUFDNEIsVUFENUIsRUFDd0MsUUFEeEMsQ0FBM0I7O0FBR0EsU0FBU0Msd0JBQVQsQ0FBa0NDLE1BQWxDLEVBQTBDO0FBQ3hDLE1BQUlDLGNBQWNELE9BQU9DLFdBQXpCO0FBQ0EsTUFBSUMsVUFBVUYsT0FBT0UsT0FBckI7QUFDQSxNQUFJQyxTQUFTQyxVQUFVSCxXQUFWLENBQWI7QUFDQSxNQUFJSSxXQUFXQyxZQUFZTCxXQUFaLENBQWY7QUFDQSxNQUFJTSxjQUFjO0FBQ2hCTixpQkFBYUEsV0FERztBQUVoQkMsYUFBU0EsT0FGTztBQUdoQk0sV0FBT0w7QUFIUyxHQUFsQjs7QUFNQSxNQUFJVCxPQUFPZSxJQUFQLENBQVlULE1BQVosRUFBb0IsV0FBcEIsQ0FBSixFQUFzQztBQUNwQ08sZ0JBQVlHLFNBQVosR0FDRUMsS0FBS0MsR0FBTCxLQUFhLE9BQU9DLFNBQVNi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MUQsQ0FESSxFQUVKO0FBQUVkLGdCQUFVWSxJQUFJWjtBQUFoQixLQUZJLENBQU47QUFJRDtBQUNGLENBWEQ7O0FBYUF2RCxPQUFPOEUsa0JBQVAsR0FBNEIsVUFBU0MsZUFBVCxFQUEwQkMsZ0JBQTFCLEVBQTRDO0FBQ3RFLFNBQU9qQyxNQUFNK0Isa0JBQU4sQ0FBeUJDLGVBQXpCLEVBQTBDQyxnQkFBMUMsQ0FBUDtBQUNELENBRkQsQzs7Ozs7Ozs7Ozs7QUNySkE7QUFDQTtBQUNBaEYsU0FBU2lGLE9BQU9DLE9BQWhCLEMsQ0FFQTs7QUFDQWxGLE9BQU9BLE1BQVAsR0FBZ0JBLE1BQWhCLEMiLCJmaWxlIjoiL3BhY2thZ2VzL2dvb2dsZS1vYXV0aC5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBHb29nbGUgPSByZXF1aXJlKFwiLi9uYW1lc3BhY2UuanNcIik7XG52YXIgQWNjb3VudHMgPSByZXF1aXJlKFwibWV0ZW9yL2FjY291bnRzLWJhc2VcIikuQWNjb3VudHM7XG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20vYWNjb3VudHMvZG9jcy9PQXV0aDJMb2dpbiN1c2VyaW5mb2NhbGxcbkdvb2dsZS53aGl0ZWxpc3RlZEZpZWxkcyA9IFsnaWQnLCAnZW1haWwnLCAndmVyaWZpZWRfZW1haWwnLCAnbmFtZScsICdnaXZlbl9uYW1lJyxcbiAgICAgICAgICAgICAgICAgICAnZmFtaWx5X25hbWUnLCAncGljdHVyZScsICdsb2NhbGUnLCAndGltZXpvbmUnLCAnZ2VuZGVyJ107XG5cbmZ1bmN0aW9uIGdldFNlcnZpY2VEYXRhRnJvbVRva2Vucyh0b2tlbnMpIHtcbiAgdmFyIGFjY2Vzc1Rva2VuID0gdG9rZW5zLmFjY2Vzc1Rva2VuO1xuICB2YXIgaWRUb2tlbiA9IHRva2Vucy5pZFRva2VuO1xuICB2YXIgc2NvcGVzID0gZ2V0U2NvcGVzKGFjY2Vzc1Rva2VuKTtcbiAgdmFyIGlkZW50aXR5ID0gZ2V0SWRlbnRpdHkoYWNjZXNzVG9rZW4pO1xuICB2YXIgc2VydmljZURhdGEgPSB7XG4gICAgYWNjZXNzVG9rZW46IGFjY2Vzc1Rva2VuLFxuICAgIGlkVG9rZW46IGlkVG9rZW4sXG4gICAgc2NvcGU6IHNjb3Blc1xuICB9O1xuXG4gIGlmIChoYXNPd24uY2FsbCh0b2tlbnMsIFwiZXhwaXJlc0luXCIpKSB7XG4gICAgc2VydmljZURhdGEuZXhwaXJlc0F0ID1cbiAgICAgIERhdGUubm93KCkgKyAxMDAwICogcGFyc2VJbnQodG9rZW5zLmV4cGlyZXNJbiwgMTApO1xuICB9XG5cbiAgdmFyIGZpZWxkcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIEdvb2dsZS53aGl0ZWxpc3RlZEZpZWxkcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKGhhc093bi5jYWxsKGlkZW50aXR5LCBuYW1lKSkge1xuICAgICAgZmllbGRzW25hbWVdID0gaWRlbnRpdHlbbmFtZV07XG4gICAgfVxuICB9KTtcblxuICBPYmplY3QuYXNzaWduKHNlcnZpY2VEYXRhLCBmaWVsZHMpO1xuXG4gIC8vIG9ubHkgc2V0IHRoZSB0b2tlbiBpbiBzZXJ2aWNlRGF0YSBpZiBpdCdzIHRoZXJlLiB0aGlzIGVuc3VyZXNcbiAgLy8gdGhhdCB3ZSBkb24ndCBsb3NlIG9sZCBvbmVzIChzaW5jZSB3ZSBvbmx5IGdldCB0aGlzIG9uIHRoZSBmaXJzdFxuICAvLyBsb2cgaW4gYXR0ZW1wdClcbiAgaWYgKHRva2Vucy5yZWZyZXNoVG9rZW4pIHtcbiAgICBzZXJ2aWNlRGF0YS5yZWZyZXNoVG9rZW4gPSB0b2tlbnMucmVmcmVzaFRva2VuO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZXJ2aWNlRGF0YTogc2VydmljZURhdGEsXG4gICAgb3B0aW9uczoge1xuICAgICAgcHJvZmlsZToge1xuICAgICAgICBuYW1lOiBpZGVudGl0eS5uYW1lXG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG5BY2NvdW50cy5yZWdpc3RlckxvZ2luSGFuZGxlcihmdW5jdGlvbiAocmVxdWVzdCkge1xuICBpZiAocmVxdWVzdC5nb29nbGVTaWduSW4gIT09IHRydWUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB0b2tlbnMgPSB7XG4gICAgYWNjZXNzVG9rZW46IHJlcXVlc3QuYWNjZXNzVG9rZW4sXG4gICAgcmVmcmVzaFRva2VuOiByZXF1ZXN0LnJlZnJlc2hUb2tlbixcbiAgICBpZFRva2VuOiByZXF1ZXN0LmlkVG9rZW4sXG4gIH07XG5cbiAgaWYgKHJlcXVlc3Quc2VydmVyQXV0aENvZGUpIHtcbiAgICBPYmplY3QuYXNzaWduKHRva2VucywgZ2V0VG9rZW5zKHtcbiAgICAgIGNvZGU6IHJlcXVlc3Quc2VydmVyQXV0aENvZGVcbiAgICB9KSk7XG4gIH1cblxuICBjb25zdCByZXN1bHQgPSBnZXRTZXJ2aWNlRGF0YUZyb21Ub2tlbnModG9rZW5zKTtcblxuICByZXR1cm4gQWNjb3VudHMudXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZShcImdvb2dsZVwiLCB7XG4gICAgaWQ6IHJlcXVlc3QudXNlcklkLFxuICAgIGlkVG9rZW46IHJlcXVlc3QuaWRUb2tlbixcbiAgICBhY2Nlc3NUb2tlbjogcmVxdWVzdC5hY2Nlc3NUb2tlbixcbiAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcbiAgICBwaWN0dXJlOiByZXF1ZXN0LmltYWdlVXJsLFxuICAgIC4uLnJlc3VsdC5zZXJ2aWNlRGF0YSxcbiAgfSwgcmVzdWx0Lm9wdGlvbnMpO1xufSk7XG5cbmZ1bmN0aW9uIGdldFNlcnZpY2VEYXRhKHF1ZXJ5KSB7XG4gIHJldHVybiBnZXRTZXJ2aWNlRGF0YUZyb21Ub2tlbnMoZ2V0VG9rZW5zKHF1ZXJ5KSk7XG59XG5cbk9BdXRoLnJlZ2lzdGVyU2VydmljZSgnZ29vZ2xlJywgMiwgbnVsbCwgZ2V0U2VydmljZURhdGEpO1xuXG4vLyByZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nOlxuLy8gLSBhY2Nlc3NUb2tlblxuLy8gLSBleHBpcmVzSW46IGxpZmV0aW1lIG9mIHRva2VuIGluIHNlY29uZHNcbi8vIC0gcmVmcmVzaFRva2VuLCBpZiB0aGlzIGlzIHRoZSBmaXJzdCBhdXRob3JpemF0aW9uIHJlcXVlc3RcbnZhciBnZXRUb2tlbnMgPSBmdW5jdGlvbiAocXVlcnkpIHtcbiAgdmFyIGNvbmZpZyA9IFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLmZpbmRPbmUoe3NlcnZpY2U6ICdnb29nbGUnfSk7XG4gIGlmICghY29uZmlnKVxuICAgIHRocm93IG5ldyBTZXJ2aWNlQ29uZmlndXJhdGlvbi5Db25maWdFcnJvcigpO1xuXG4gIHZhciByZXNwb25zZTtcbiAgdHJ5IHtcbiAgICByZXNwb25zZSA9IEhUVFAucG9zdChcbiAgICAgIFwiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL3Rva2VuXCIsIHtwYXJhbXM6IHtcbiAgICAgICAgY29kZTogcXVlcnkuY29kZSxcbiAgICAgICAgY2xpZW50X2lkOiBjb25maWcuY2xpZW50SWQsXG4gICAgICAgIGNsaWVudF9zZWNyZXQ6IE9BdXRoLm9wZW5TZWNyZXQoY29uZmlnLnNlY3JldCksXG4gICAgICAgIHJlZGlyZWN0X3VyaTogT0F1dGguX3JlZGlyZWN0VXJpKCdnb29nbGUnLCBjb25maWcpLFxuICAgICAgICBncmFudF90eXBlOiAnYXV0aG9yaXphdGlvbl9jb2RlJ1xuICAgICAgfX0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB0aHJvdyBPYmplY3QuYXNzaWduKFxuICAgICAgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNvbXBsZXRlIE9BdXRoIGhhbmRzaGFrZSB3aXRoIEdvb2dsZS4gXCIgKyBlcnIubWVzc2FnZSksXG4gICAgICB7IHJlc3BvbnNlOiBlcnIucmVzcG9uc2UgfVxuICAgICk7XG4gIH1cblxuICBpZiAocmVzcG9uc2UuZGF0YS5lcnJvcikgeyAvLyBpZiB0aGUgaHR0cCByZXNwb25zZSB3YXMgYSBqc29uIG9iamVjdCB3aXRoIGFuIGVycm9yIGF0dHJpYnV0ZVxuICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBjb21wbGV0ZSBPQXV0aCBoYW5kc2hha2Ugd2l0aCBHb29nbGUuIFwiICsgcmVzcG9uc2UuZGF0YS5lcnJvcik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjY2Vzc1Rva2VuOiByZXNwb25zZS5kYXRhLmFjY2Vzc190b2tlbixcbiAgICAgIHJlZnJlc2hUb2tlbjogcmVzcG9uc2UuZGF0YS5yZWZyZXNoX3Rva2VuLFxuICAgICAgZXhwaXJlc0luOiByZXNwb25zZS5kYXRhLmV4cGlyZXNfaW4sXG4gICAgICBpZFRva2VuOiByZXNwb25zZS5kYXRhLmlkX3Rva2VuXG4gICAgfTtcbiAgfVxufTtcblxudmFyIGdldElkZW50aXR5ID0gZnVuY3Rpb24gKGFjY2Vzc1Rva2VuKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEhUVFAuZ2V0KFxuICAgICAgXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvdXNlcmluZm9cIixcbiAgICAgIHtwYXJhbXM6IHthY2Nlc3NfdG9rZW46IGFjY2Vzc1Rva2VufX0pLmRhdGE7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHRocm93IE9iamVjdC5hc3NpZ24oXG4gICAgICBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gZmV0Y2ggaWRlbnRpdHkgZnJvbSBHb29nbGUuIFwiICsgZXJyLm1lc3NhZ2UpLFxuICAgICAgeyByZXNwb25zZTogZXJyLnJlc3BvbnNlIH1cbiAgICApO1xuICB9XG59O1xuXG52YXIgZ2V0U2NvcGVzID0gZnVuY3Rpb24gKGFjY2Vzc1Rva2VuKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEhUVFAuZ2V0KFxuICAgICAgXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvdG9rZW5pbmZvXCIsXG4gICAgICB7cGFyYW1zOiB7YWNjZXNzX3Rva2VuOiBhY2Nlc3NUb2tlbn19KS5kYXRhLnNjb3BlLnNwbGl0KCcgJyk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHRocm93IE9iamVjdC5hc3NpZ24oXG4gICAgICBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gZmV0Y2ggdG9rZW5pbmZvIGZyb20gR29vZ2xlLiBcIiArIGVyci5tZXNzYWdlKSxcbiAgICAgIHsgcmVzcG9uc2U6IGVyci5yZXNwb25zZSB9XG4gICAgKTtcbiAgfVxufTtcblxuR29vZ2xlLnJldHJpZXZlQ3JlZGVudGlhbCA9IGZ1bmN0aW9uKGNyZWRlbnRpYWxUb2tlbiwgY3JlZGVudGlhbFNlY3JldCkge1xuICByZXR1cm4gT0F1dGgucmV0cmlldmVDcmVkZW50aWFsKGNyZWRlbnRpYWxUb2tlbiwgY3JlZGVudGlhbFNlY3JldCk7XG59O1xuIiwiLy8gVGhlIG1vZHVsZS5leHBvcnRzIG9iamVjdCBvZiB0aGlzIG1vZHVsZSBiZWNvbWVzIHRoZSBHb29nbGUgbmFtZXNwYWNlXG4vLyBmb3Igb3RoZXIgbW9kdWxlcyBpbiB0aGlzIHBhY2thZ2UuXG5Hb29nbGUgPSBtb2R1bGUuZXhwb3J0cztcblxuLy8gU28gdGhhdCBhcGkuZXhwb3J0IGZpbmRzIHRoZSBcIkdvb2dsZVwiIHByb3BlcnR5LlxuR29vZ2xlLkdvb2dsZSA9IEdvb2dsZTtcbiJdfQ==
