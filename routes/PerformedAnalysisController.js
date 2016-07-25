var Controller = require('./Controller');

var PerformedAnalysisController = function(app) {
	Controller.call(this, app, 'performedanalysis');
};

PerformedAnalysisController.prototype = Object.create(Controller.prototype);

module.exports = PerformedAnalysisController;