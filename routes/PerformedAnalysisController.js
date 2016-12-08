var Controller = require('./Controller');
var MongoPerformedAnalysis = require('../analysis/MongoPerformedAnalysis');
var MongoPerformedAnalyse = require('../analysis/MongoPerformedAnalyse');

class PerformedAnalysisController extends Controller {
	constructor(app) {
		super(app, 'performedanalysis', MongoPerformedAnalysis, MongoPerformedAnalyse);
	}

    hasRights(user, method, id, object) {
        return user.hasPermission('dataset', method, object.dataset);
    }
}

module.exports = PerformedAnalysisController;