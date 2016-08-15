var Controller = require('./Controller');

var AttributeController = function(app) {
	Controller.call(this, app, 'attribute');
};

AttributeController.prototype = Object.create(Controller.prototype);

module.exports = AttributeController;