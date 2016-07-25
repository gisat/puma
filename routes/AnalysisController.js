var Controller = require('./Controller');

var AnalysisController = function(app) {
	Controller.call(this, app, 'analysis');
};

AnalysisController.prototype = Object.create(Controller.prototype);

module.exports = AnalysisController;