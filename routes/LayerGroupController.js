var Controller = require('./Controller');

var LayerGroupController = function(app) {
	Controller.call(this, app, 'layergroup');
};

LayerGroupController.prototype = Object.create(Controller.prototype);

module.exports = LayerGroupController;