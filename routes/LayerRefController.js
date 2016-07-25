var Controller = require('./Controller');

var LayerRefController = function(app) {
	Controller.call(this, app, 'layerref');
};

LayerRefController.prototype = Object.create(Controller.prototype);

module.exports = LayerRefController;