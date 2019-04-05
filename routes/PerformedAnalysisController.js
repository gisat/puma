var Controller = require('./Controller');
var MongoPerformedAnalysis = require('../analysis/MongoPerformedAnalysis');
var MongoPerformedAnalyse = require('../analysis/MongoPerformedAnalyse');

class PerformedAnalysisController extends Controller {
	constructor(app, pool) {
		super(app, 'performedanalysis', pool, MongoPerformedAnalysis, MongoPerformedAnalyse);
	}

    hasRights(user, method, id, object) {
        return user.hasPermission('dataset', method, object.dataset) &&
			user.hasPermission('location', method, object.location);
    }
}

module.exports = PerformedAnalysisController;