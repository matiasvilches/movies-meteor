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

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// packages/github-config-ui/template.github_configure.js                                      //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
                                                                                               // 1
Template.__checkName("configureLoginServiceDialogForGithub");                                  // 2
Template["configureLoginServiceDialogForGithub"] = new Template("Template.configureLoginServiceDialogForGithub", (function() {
  var view = this;                                                                             // 4
  return [ HTML.Raw("<p>\n    First, you'll need to get a Github Client ID. Follow these steps:\n  </p>\n  "), HTML.OL("\n    ", HTML.Raw('<li>\n      Visit <a href="https://github.com/settings/applications/new" target="blank">https://github.com/settings/applications/new</a>\n    </li>'), "\n    ", HTML.LI("\n      Set Homepage URL to: ", HTML.SPAN({
    class: "url"                                                                               // 6
  }, Blaze.View("lookup:siteUrl", function() {                                                 // 7
    return Spacebars.mustache(view.lookup("siteUrl"));                                         // 8
  })), "\n    "), "\n    ", HTML.LI("\n      Set Authorization callback URL to: ", HTML.SPAN({
    class: "url"                                                                               // 10
  }, Blaze.View("lookup:siteUrl", function() {                                                 // 11
    return Spacebars.mustache(view.lookup("siteUrl"));                                         // 12
  }), "_oauth/github"), "\n    "), "\n  ") ];                                                  // 13
}));                                                                                           // 14
                                                                                               // 15
/////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// packages/github-config-ui/github_configure.js                                               //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
Template.configureLoginServiceDialogForGithub.helpers({                                        // 1
  siteUrl: function () {                                                                       // 2
    return Meteor.absoluteUrl();                                                               // 3
  }                                                                                            // 4
});                                                                                            // 5
                                                                                               // 6
Template.configureLoginServiceDialogForGithub.fields = function () {                           // 7
  return [                                                                                     // 8
    {property: 'clientId', label: 'Client ID'},                                                // 9
    {property: 'secret', label: 'Client Secret'}                                               // 10
  ];                                                                                           // 11
};                                                                                             // 12
                                                                                               // 13
/////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['github-config-ui'] = {};

})();
