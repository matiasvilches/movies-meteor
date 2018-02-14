var require = meteorInstall({"methods":{"methods.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// methods/methods.js                                                //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
Meteor.methods({
  agregarPelicula: function (titulo) {
    Peliculas.insert({
      titulo: titulo,
      createdAt: new Date(),
      owner: Meteor.userId()
    });
  },
  actualizarPelicula: function (id, checked) {
    var pel = Peliculas.findOne(id);

    if (pel.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Peliculas.update(id, {
      $set: {
        checked: checked
      }
    });
  },
  eliminarPelicula: function (id) {
    var pel = Peliculas.findOne(id);

    if (pel.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Peliculas.remove(id);
  },
  setPrivate: function (id, private) {
    var pel = Peliculas.findOne(id);

    if (pel.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Peliculas.update(id, {
      $set: {
        private: private
      }
    });
  }
});
///////////////////////////////////////////////////////////////////////

}},"server":{"main.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// server/main.js                                                    //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
Peliculas = new Mongo.Collection('peliculas');
Meteor.startup(() => {// code to run on server at startup
});
Meteor.publish('peliculas', function () {
  return Peliculas.find({
    $or: [{
      private: {
        $ne: true
      }
    }, {
      owner: this.userId
    }]
  });
});
///////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./methods/methods.js");
require("./server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvbWV0aG9kcy9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJNZXRlb3IiLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwibWV0aG9kcyIsImFncmVnYXJQZWxpY3VsYSIsInRpdHVsbyIsIlBlbGljdWxhcyIsImluc2VydCIsImNyZWF0ZWRBdCIsIkRhdGUiLCJvd25lciIsInVzZXJJZCIsImFjdHVhbGl6YXJQZWxpY3VsYSIsImlkIiwiY2hlY2tlZCIsInBlbCIsImZpbmRPbmUiLCJFcnJvciIsInVwZGF0ZSIsIiRzZXQiLCJlbGltaW5hclBlbGljdWxhIiwicmVtb3ZlIiwic2V0UHJpdmF0ZSIsInByaXZhdGUiLCJNb25nbyIsIkNvbGxlY3Rpb24iLCJzdGFydHVwIiwicHVibGlzaCIsImZpbmQiLCIkb3IiLCIkbmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsSUFBSUEsTUFBSjtBQUFXQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsZUFBUixDQUFiLEVBQXNDO0FBQUNILFNBQU9JLENBQVAsRUFBUztBQUFDSixhQUFPSSxDQUFQO0FBQVM7O0FBQXBCLENBQXRDLEVBQTRELENBQTVEO0FBRVhKLE9BQU9LLE9BQVAsQ0FBZTtBQUNiQyxtQkFBaUIsVUFBU0MsTUFBVCxFQUFpQjtBQUNoQ0MsY0FBVUMsTUFBVixDQUFpQjtBQUNmRixjQUFRQSxNQURPO0FBRWZHLGlCQUFXLElBQUlDLElBQUosRUFGSTtBQUdmQyxhQUFPWixPQUFPYSxNQUFQO0FBSFEsS0FBakI7QUFLRCxHQVBZO0FBUWJDLHNCQUFvQixVQUFTQyxFQUFULEVBQWFDLE9BQWIsRUFBc0I7QUFDeEMsUUFBSUMsTUFBTVQsVUFBVVUsT0FBVixDQUFrQkgsRUFBbEIsQ0FBVjs7QUFFQSxRQUFJRSxJQUFJTCxLQUFKLEtBQWNaLE9BQU9hLE1BQVAsRUFBbEIsRUFBbUM7QUFDakMsWUFBTSxJQUFJYixPQUFPbUIsS0FBWCxDQUFpQixnQkFBakIsQ0FBTjtBQUNEOztBQUVEWCxjQUFVWSxNQUFWLENBQWlCTCxFQUFqQixFQUFxQjtBQUFDTSxZQUFNO0FBQUNMLGlCQUFTQTtBQUFWO0FBQVAsS0FBckI7QUFDRCxHQWhCWTtBQWlCYk0sb0JBQWtCLFVBQVNQLEVBQVQsRUFBYTtBQUM3QixRQUFJRSxNQUFNVCxVQUFVVSxPQUFWLENBQWtCSCxFQUFsQixDQUFWOztBQUVBLFFBQUlFLElBQUlMLEtBQUosS0FBY1osT0FBT2EsTUFBUCxFQUFsQixFQUFtQztBQUNqQyxZQUFNLElBQUliLE9BQU9tQixLQUFYLENBQWlCLGdCQUFqQixDQUFOO0FBQ0Q7O0FBRURYLGNBQVVlLE1BQVYsQ0FBaUJSLEVBQWpCO0FBQ0QsR0F6Qlk7QUEwQmJTLGNBQVksVUFBU1QsRUFBVCxFQUFhVSxPQUFiLEVBQXNCO0FBQ2hDLFFBQUlSLE1BQU1ULFVBQVVVLE9BQVYsQ0FBa0JILEVBQWxCLENBQVY7O0FBRUEsUUFBSUUsSUFBSUwsS0FBSixLQUFjWixPQUFPYSxNQUFQLEVBQWxCLEVBQW1DO0FBQ2pDLFlBQU0sSUFBSWIsT0FBT21CLEtBQVgsQ0FBaUIsZ0JBQWpCLENBQU47QUFDRDs7QUFFRFgsY0FBVVksTUFBVixDQUFpQkwsRUFBakIsRUFBcUI7QUFBQ00sWUFBTTtBQUFDSSxpQkFBU0E7QUFBVjtBQUFQLEtBQXJCO0FBQ0Q7QUFsQ1ksQ0FBZixFOzs7Ozs7Ozs7OztBQ0ZBLElBQUl6QixNQUFKO0FBQVdDLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxlQUFSLENBQWIsRUFBc0M7QUFBQ0gsU0FBT0ksQ0FBUCxFQUFTO0FBQUNKLGFBQU9JLENBQVA7QUFBUzs7QUFBcEIsQ0FBdEMsRUFBNEQsQ0FBNUQ7QUFFWEksWUFBWSxJQUFJa0IsTUFBTUMsVUFBVixDQUFxQixXQUFyQixDQUFaO0FBRUEzQixPQUFPNEIsT0FBUCxDQUFlLE1BQU0sQ0FDbkI7QUFDRCxDQUZEO0FBSUE1QixPQUFPNkIsT0FBUCxDQUFlLFdBQWYsRUFBNEIsWUFBVztBQUNyQyxTQUFPckIsVUFBVXNCLElBQVYsQ0FBZTtBQUNwQkMsU0FBSyxDQUNIO0FBQUVOLGVBQVM7QUFBQ08sYUFBSztBQUFOO0FBQVgsS0FERyxFQUVIO0FBQUVwQixhQUFPLEtBQUtDO0FBQWQsS0FGRztBQURlLEdBQWYsQ0FBUDtBQU1ELENBUEQsRSIsImZpbGUiOiIvYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5cbk1ldGVvci5tZXRob2RzKHtcbiAgYWdyZWdhclBlbGljdWxhOiBmdW5jdGlvbih0aXR1bG8pIHtcbiAgICBQZWxpY3VsYXMuaW5zZXJ0KHtcbiAgICAgIHRpdHVsbzogdGl0dWxvLFxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxuICAgICAgb3duZXI6IE1ldGVvci51c2VySWQoKVxuICAgIH0pO1xuICB9LFxuICBhY3R1YWxpemFyUGVsaWN1bGE6IGZ1bmN0aW9uKGlkLCBjaGVja2VkKSB7XG4gICAgdmFyIHBlbCA9IFBlbGljdWxhcy5maW5kT25lKGlkKTtcblxuICAgIGlmIChwZWwub3duZXIgIT09IE1ldGVvci51c2VySWQoKSkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90LWF1dGhvcml6ZWQnKTtcbiAgICB9XG5cbiAgICBQZWxpY3VsYXMudXBkYXRlKGlkLCB7JHNldDoge2NoZWNrZWQ6IGNoZWNrZWR9fSk7XG4gIH0sXG4gIGVsaW1pbmFyUGVsaWN1bGE6IGZ1bmN0aW9uKGlkKSB7XG4gICAgdmFyIHBlbCA9IFBlbGljdWxhcy5maW5kT25lKGlkKTtcblxuICAgIGlmIChwZWwub3duZXIgIT09IE1ldGVvci51c2VySWQoKSkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90LWF1dGhvcml6ZWQnKTtcbiAgICB9XG5cbiAgICBQZWxpY3VsYXMucmVtb3ZlKGlkKTtcbiAgfSxcbiAgc2V0UHJpdmF0ZTogZnVuY3Rpb24oaWQsIHByaXZhdGUpIHtcbiAgICB2YXIgcGVsID0gUGVsaWN1bGFzLmZpbmRPbmUoaWQpO1xuXG4gICAgaWYgKHBlbC5vd25lciAhPT0gTWV0ZW9yLnVzZXJJZCgpKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdub3QtYXV0aG9yaXplZCcpO1xuICAgIH1cblxuICAgIFBlbGljdWxhcy51cGRhdGUoaWQsIHskc2V0OiB7cHJpdmF0ZTogcHJpdmF0ZX19KTtcbiAgfVxufSk7XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcblxuUGVsaWN1bGFzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ3BlbGljdWxhcycpO1xuXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG4gIC8vIGNvZGUgdG8gcnVuIG9uIHNlcnZlciBhdCBzdGFydHVwXG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goJ3BlbGljdWxhcycsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gUGVsaWN1bGFzLmZpbmQoe1xuICAgICRvcjogW1xuICAgICAgeyBwcml2YXRlOiB7JG5lOiB0cnVlfSB9LFxuICAgICAgeyBvd25lcjogdGhpcy51c2VySWQgfVxuICAgIF1cbiAgfSk7XG59KTtcbiJdfQ==
