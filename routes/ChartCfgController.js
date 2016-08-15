var Controller = require('./Controller');

var ChartCfgController = function(app) {
	Controller.call(this, app, 'chartcfg');
};

ChartCfgController.prototype = Object.create(Controller.prototype);

module.exports = ChartCfgController;