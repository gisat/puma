var Controller = require('./Controller');

var ScopeController = function(app) {
	Controller.call(this, app, 'scope');
};

ScopeController.prototype = Object.create(Controller.prototype);

module.exports = ScopeController;