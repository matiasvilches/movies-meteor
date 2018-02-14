import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';

import './main.html';

Peliculas = new Mongo.Collection('peliculas');

Meteor.subscribe('peliculas');

Template.body.helpers({
  peliculas: function () {
    if (Session.get('hideFinished')) {
      return Peliculas.find({checked: {$ne: true}});
    } else {
      return Peliculas.find();
    }
  },
  hideFinished: function() {
    return Session.get('hideFinished');
  }
});

Template.body.events({
  'submit .nueva-pelicula': function(event) {
    const titulo = event.target.titulo.value;

    Meteor.call('agregarPelicula', titulo);

    event.target.titulo.value = '';
    return false;
  },
  'change .hide-finished': function(event) {
    Session.set('hideFinished', event.target.checked);
  }
});

Template.pelicula.helpers({
  isOwner: function() {
    return this.owner === Meteor.userId();
  }
});

Template.pelicula.events({
  'click .toggle-checked': function(){
    Meteor.call('actualizarPelicula', this._id, !this.checked);
  },
  'click .delete': function() {
    Meteor.call('eliminarPelicula', this._id);
  },
  'click .toggle-private': function(){
    Meteor.call('setPrivate', this._id, !this.private);
  }
});

Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});
