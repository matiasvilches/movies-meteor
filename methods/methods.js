import { Meteor } from 'meteor/meteor';

Meteor.methods({
  agregarPelicula: function(titulo) {
    Peliculas.insert({
      titulo: titulo,
      createdAt: new Date(),
      owner: Meteor.userId()
    });
  },
  actualizarPelicula: function(id, checked) {
    var pel = Peliculas.findOne(id);

    if (pel.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Peliculas.update(id, {$set: {checked: checked}});
  },
  eliminarPelicula: function(id) {
    var pel = Peliculas.findOne(id);

    if (pel.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Peliculas.remove(id);
  },
  setPrivate: function(id, private) {
    var pel = Peliculas.findOne(id);

    if (pel.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Peliculas.update(id, {$set: {private: private}});
  }
});
