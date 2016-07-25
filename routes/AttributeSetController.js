var Controller = require('./Controller');

var AttributeSetController = function(app) {
	Controller.call(this, app, 'attributeset');
};

AttributeSetController.prototype = Object.create(Controller.prototype);

module.exports = AttributeSetController;