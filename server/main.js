import { Meteor } from 'meteor/meteor';

Peliculas = new Mongo.Collection('peliculas');

Meteor.startup(() => {
  // code to run on server at startup
});

Meteor.publish('peliculas', function() {
  return Peliculas.find({
    $or: [
      { private: {$ne: true} },
      { owner: this.userId }
    ]
  });
});
