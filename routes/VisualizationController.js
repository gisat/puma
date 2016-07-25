var Controller = require('./Controller');

var VisualizationController = function(app) {
	Controller.call(this, app, 'visualization');
};

VisualizationController.prototype = Object.create(Controller.prototype);

module.exports = VisualizationController;