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
var Template = Package['templating-runtime'].Template;
var Blaze = Package.blaze.Blaze;
var UI = Package.blaze.UI;
var Handlebars = Package.blaze.Handlebars;
var Spacebars = Package.spacebars.Spacebars;
var HTML = Package.htmljs.HTML;

(function(){

//////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                          //
// packages/google-config-ui/template.google_configure.js                                   //
//                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////
                                                                                            //
                                                                                            // 1
Template.__checkName("configureLoginServiceDialogForGoogle");                               // 2
Template["configureLoginServiceDialogForGoogle"] = new Template("Template.configureLoginServiceDialogForGoogle", (function() {
  var view = this;                                                                          // 4
  return [ HTML.Raw("<p>\n    First, you'll need to get a Google Client ID. Follow these steps:\n  </p>\n  "), HTML.OL("\n    ", HTML.Raw('<li>\n      Visit <a href="https://console.developers.google.com/" target="blank">https://console.developers.google.com/</a>\n    </li>'), "\n    ", HTML.Raw('<li>\n      "Create Project", if needed. Wait for Google to finish provisioning.\n    </li>'), "\n    ", HTML.Raw('<li>\n      On the left sidebar, go to "Credentials" and, on the right, "OAuth consent screen". Make sure to enter an email address and a product name, and save.\n    </li>'), "\n    ", HTML.Raw('<li>\n      On the left sidebar, go to "Credentials". Click the "Create credentials" button, then select "OAuth client ID" as the type.\n    </li>'), "\n    ", HTML.Raw('<li>\n      Select "Web application" as your application type.\n    </li>'), "\n    ", HTML.LI("\n     Set Authorized Javascript Origins to: ", HTML.SPAN({
    class: "url"                                                                            // 6
  }, Blaze.View("lookup:siteUrl", function() {                                              // 7
    return Spacebars.mustache(view.lookup("siteUrl"));                                      // 8
  })), "\n    "), "\n    ", HTML.LI("\n      Set Authorized Redirect URI to: ", HTML.SPAN({
    class: "url"                                                                            // 10
  }, Blaze.View("lookup:siteUrl", function() {                                              // 11
    return Spacebars.mustache(view.lookup("siteUrl"));                                      // 12
  }), "/_oauth/google"), "\n    "), "\n    ", HTML.Raw('<li>\n      Finish by clicking "Create".\n    </li>'), "\n  ") ];
}));                                                                                        // 14
                                                                                            // 15
//////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

//////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                          //
// packages/google-config-ui/google_configure.js                                            //
//                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////
                                                                                            //
Template.configureLoginServiceDialogForGoogle.helpers({                                     // 1
  siteUrl: function () {                                                                    // 2
    var url = Meteor.absoluteUrl();                                                         // 3
    if (url.slice(-1) === "/") {                                                            // 4
      url = url.slice(0,-1)                                                                 // 5
    }                                                                                       // 6
    return url;                                                                             // 7
  }                                                                                         // 8
});                                                                                         // 9
                                                                                            // 10
Template.configureLoginServiceDialogForGoogle.fields = function () {                        // 11
  return [                                                                                  // 12
    {property: 'clientId', label: 'Client ID'},                                             // 13
    {property: 'secret', label: 'Client secret'}                                            // 14
  ];                                                                                        // 15
};                                                                                          // 16
                                                                                            // 17
//////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['google-config-ui'] = {};

})();
