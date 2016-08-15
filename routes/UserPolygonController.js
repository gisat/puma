var Controller = require('./Controller');

var UserPolygonController = function(app) {
	Controller.call(this, app, 'userpolygon');
};

UserPolygonController.prototype = Object.create(Controller.prototype);

module.exports = UserPolygonController;