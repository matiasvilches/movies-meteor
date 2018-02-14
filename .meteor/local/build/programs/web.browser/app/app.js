var require = meteorInstall({"client":{"main.html":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// client/main.html                                                                                         //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
module.watch(require("./template.main.js"), {                                                               // 1
  "*": module.makeNsSetter()                                                                                // 2
});                                                                                                         // 3
                                                                                                            // 4
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.main.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// client/template.main.js                                                                                  //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
                                                                                                            // 1
Template.body.addContent((function() {                                                                      // 2
  var view = this;                                                                                          // 3
  return HTML.DIV({                                                                                         // 4
    class: "container"                                                                                      // 5
  }, "\n    ", HTML.HEADER("\n      ", HTML.Raw("<h1>Peliculas</h1>"), "\n      ", HTML.DIV({               // 6
    class: "login"                                                                                          // 7
  }, " ", Spacebars.include(view.lookupTemplate("loginButtons")), " "), "\n\n      ", Blaze.If(function() {
    return Spacebars.call(view.lookup("currentUser"));                                                      // 9
  }, function() {                                                                                           // 10
    return [ "\n        ", HTML.LABEL({                                                                     // 11
      class: "hide-finished"                                                                                // 12
    }, "\n          ", HTML.INPUT({                                                                         // 13
      type: "checkbox",                                                                                     // 14
      checked: function() {                                                                                 // 15
        return Spacebars.mustache(view.lookup("hideFinished"));                                             // 16
      }                                                                                                     // 17
    }), "Ocultar Peliculas\n        "), "\n        ", HTML.FORM({                                           // 18
      class: "nueva-pelicula"                                                                               // 19
    }, "\n          ", HTML.INPUT({                                                                         // 20
      type: "text",                                                                                         // 21
      name: "titulo",                                                                                       // 22
      placeholder: "Una nueva pelicula"                                                                     // 23
    }), "\n          ", HTML.INPUT({                                                                        // 24
      type: "submit",                                                                                       // 25
      value: "Agregar"                                                                                      // 26
    }), "\n        "), "\n      " ];                                                                        // 27
  }), "\n    "), "\n\n    ", HTML.UL(" ", Blaze.Each(function() {                                           // 28
    return Spacebars.call(view.lookup("peliculas"));                                                        // 29
  }, function() {                                                                                           // 30
    return [ " ", Spacebars.include(view.lookupTemplate("pelicula")), " " ];                                // 31
  }), " "), "\n  ");                                                                                        // 32
}));                                                                                                        // 33
Meteor.startup(Template.body.renderToDocument);                                                             // 34
                                                                                                            // 35
Template.__checkName("pelicula");                                                                           // 36
Template["pelicula"] = new Template("Template.pelicula", (function() {                                      // 37
  var view = this;                                                                                          // 38
  return HTML.LI({                                                                                          // 39
    class: function() {                                                                                     // 40
      return Blaze.If(function() {                                                                          // 41
        return Spacebars.call(view.lookup("checked"));                                                      // 42
      }, function() {                                                                                       // 43
        return "checked";                                                                                   // 44
      });                                                                                                   // 45
    }                                                                                                       // 46
  }, "\n    ", Blaze.If(function() {                                                                        // 47
    return Spacebars.call(view.lookup("isOwner"));                                                          // 48
  }, function() {                                                                                           // 49
    return [ "\n      ", HTML.INPUT({                                                                       // 50
      type: "checkbox",                                                                                     // 51
      checked: function() {                                                                                 // 52
        return Spacebars.mustache(view.lookup("checked"));                                                  // 53
      },                                                                                                    // 54
      class: "toggle-checked"                                                                               // 55
    }), "\n        ", HTML.BUTTON({                                                                         // 56
      class: "toggle-private"                                                                               // 57
    }, "\n          ", Blaze.If(function() {                                                                // 58
      return Spacebars.call(view.lookup("private"));                                                        // 59
    }, function() {                                                                                         // 60
      return "\n            Private\n          ";                                                           // 61
    }, function() {                                                                                         // 62
      return "\n            Public\n          ";                                                            // 63
    }), "\n        "), "\n    " ];                                                                          // 64
  }), "\n    ", HTML.SPAN({                                                                                 // 65
    class: "text"                                                                                           // 66
  }, Blaze.View("lookup:titulo", function() {                                                               // 67
    return Spacebars.mustache(view.lookup("titulo"));                                                       // 68
  })), "\n    ", Blaze.If(function() {                                                                      // 69
    return Spacebars.call(view.lookup("isOwner"));                                                          // 70
  }, function() {                                                                                           // 71
    return [ "\n      ", HTML.BUTTON({                                                                      // 72
      type: "button",                                                                                       // 73
      class: "delete"                                                                                       // 74
    }, "Eliminar"), "\n    " ];                                                                             // 75
  }), "\n  ");                                                                                              // 76
}));                                                                                                        // 77
                                                                                                            // 78
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"main.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// client/main.js                                                                                           //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
var Template = void 0;                                                                                      // 1
module.watch(require("meteor/templating"), {                                                                // 1
  Template: function (v) {                                                                                  // 1
    Template = v;                                                                                           // 1
  }                                                                                                         // 1
}, 0);                                                                                                      // 1
var ReactiveVar = void 0;                                                                                   // 1
module.watch(require("meteor/reactive-var"), {                                                              // 1
  ReactiveVar: function (v) {                                                                               // 1
    ReactiveVar = v;                                                                                        // 1
  }                                                                                                         // 1
}, 1);                                                                                                      // 1
var Accounts = void 0;                                                                                      // 1
module.watch(require("meteor/accounts-base"), {                                                             // 1
  Accounts: function (v) {                                                                                  // 1
    Accounts = v;                                                                                           // 1
  }                                                                                                         // 1
}, 2);                                                                                                      // 1
var Meteor = void 0;                                                                                        // 1
module.watch(require("meteor/meteor"), {                                                                    // 1
  Meteor: function (v) {                                                                                    // 1
    Meteor = v;                                                                                             // 1
  }                                                                                                         // 1
}, 3);                                                                                                      // 1
module.watch(require("./main.html"));                                                                       // 1
Peliculas = new Mongo.Collection('peliculas');                                                              // 8
Meteor.subscribe('peliculas');                                                                              // 10
Template.body.helpers({                                                                                     // 12
  peliculas: function () {                                                                                  // 13
    if (Session.get('hideFinished')) {                                                                      // 14
      return Peliculas.find({                                                                               // 15
        checked: {                                                                                          // 15
          $ne: true                                                                                         // 15
        }                                                                                                   // 15
      });                                                                                                   // 15
    } else {                                                                                                // 16
      return Peliculas.find();                                                                              // 17
    }                                                                                                       // 18
  },                                                                                                        // 19
  hideFinished: function () {                                                                               // 20
    return Session.get('hideFinished');                                                                     // 21
  }                                                                                                         // 22
});                                                                                                         // 12
Template.body.events({                                                                                      // 25
  'submit .nueva-pelicula': function (event) {                                                              // 26
    var titulo = event.target.titulo.value;                                                                 // 27
    Meteor.call('agregarPelicula', titulo);                                                                 // 29
    event.target.titulo.value = '';                                                                         // 31
    return false;                                                                                           // 32
  },                                                                                                        // 33
  'change .hide-finished': function (event) {                                                               // 34
    Session.set('hideFinished', event.target.checked);                                                      // 35
  }                                                                                                         // 36
});                                                                                                         // 25
Template.pelicula.helpers({                                                                                 // 39
  isOwner: function () {                                                                                    // 40
    return this.owner === Meteor.userId();                                                                  // 41
  }                                                                                                         // 42
});                                                                                                         // 39
Template.pelicula.events({                                                                                  // 45
  'click .toggle-checked': function () {                                                                    // 46
    Meteor.call('actualizarPelicula', this._id, !this.checked);                                             // 47
  },                                                                                                        // 48
  'click .delete': function () {                                                                            // 49
    Meteor.call('eliminarPelicula', this._id);                                                              // 50
  },                                                                                                        // 51
  'click .toggle-private': function () {                                                                    // 52
    Meteor.call('setPrivate', this._id, !this.private);                                                     // 53
  }                                                                                                         // 54
});                                                                                                         // 45
Accounts.ui.config({                                                                                        // 57
  passwordSignupFields: "USERNAME_ONLY"                                                                     // 58
});                                                                                                         // 57
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"methods.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// methods/methods.js                                                                                       //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
var Meteor = void 0;                                                                                        // 1
module.watch(require("meteor/meteor"), {                                                                    // 1
  Meteor: function (v) {                                                                                    // 1
    Meteor = v;                                                                                             // 1
  }                                                                                                         // 1
}, 0);                                                                                                      // 1
Meteor.methods({                                                                                            // 3
  agregarPelicula: function (titulo) {                                                                      // 4
    Peliculas.insert({                                                                                      // 5
      titulo: titulo,                                                                                       // 6
      createdAt: new Date(),                                                                                // 7
      owner: Meteor.userId()                                                                                // 8
    });                                                                                                     // 5
  },                                                                                                        // 10
  actualizarPelicula: function (id, checked) {                                                              // 11
    var pel = Peliculas.findOne(id);                                                                        // 12
                                                                                                            //
    if (pel.owner !== Meteor.userId()) {                                                                    // 14
      throw new Meteor.Error('not-authorized');                                                             // 15
    }                                                                                                       // 16
                                                                                                            //
    Peliculas.update(id, {                                                                                  // 18
      $set: {                                                                                               // 18
        checked: checked                                                                                    // 18
      }                                                                                                     // 18
    });                                                                                                     // 18
  },                                                                                                        // 19
  eliminarPelicula: function (id) {                                                                         // 20
    var pel = Peliculas.findOne(id);                                                                        // 21
                                                                                                            //
    if (pel.owner !== Meteor.userId()) {                                                                    // 23
      throw new Meteor.Error('not-authorized');                                                             // 24
    }                                                                                                       // 25
                                                                                                            //
    Peliculas.remove(id);                                                                                   // 27
  },                                                                                                        // 28
  setPrivate: function (id, private) {                                                                      // 29
    var pel = Peliculas.findOne(id);                                                                        // 30
                                                                                                            //
    if (pel.owner !== Meteor.userId()) {                                                                    // 32
      throw new Meteor.Error('not-authorized');                                                             // 33
    }                                                                                                       // 34
                                                                                                            //
    Peliculas.update(id, {                                                                                  // 36
      $set: {                                                                                               // 36
        "private": private                                                                                  // 36
      }                                                                                                     // 36
    });                                                                                                     // 36
  }                                                                                                         // 37
});                                                                                                         // 3
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".html",
    ".css"
  ]
});
require("./client/template.main.js");
require("./methods/methods.js");
require("./client/main.js");