var Controller = require('./Controller');

var LocationController = function(app) {
	Controller.call(this, app, 'location');
};

LocationController.prototype = Object.create(Controller.prototype);

module.exports = LocationController;