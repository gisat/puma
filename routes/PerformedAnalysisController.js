var Controller = require('./Controller');
var MongoPerformedAnalysis = require('../analysis/MongoPerformedAnalysis');
var MongoPerformedAnalyse = require('../analysis/MongoPerformedAnalyse');

class PerformedAnalysisController extends Controller {
	constructor(app) {
		super(app, 'performedanalysis', MongoPerformedAnalysis, MongoPerformedAnalyse);
	}
}

module.exports = PerformedAnalysisController;