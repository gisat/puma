var Controller = require('./Controller');

var ViewCfgController = function(app) {
	Controller.call(this, app, 'viewcfg');
};

ViewCfgController.prototype = Object.create(Controller.prototype);

module.exports = ViewCfgController;