var Controller = require('./Controller');
var MongoAnalyse = require('../analysis/MongoAnalyse');
var MongoAnalysis = require('../analysis/MongoAnalysis');

var conn = require('../common/conn');
var Promise = require('promise');

/**
 * @augments Controller
 * @alias AnalysisController
 * @param app
 * @constructor
 */
class AnalysisController extends Controller {
	constructor(app, pool) {
		super(app, 'analysis', pool, MongoAnalysis, MongoAnalyse);

		this._connection = conn.getMongoDb();
	}

	update(request, response, next) {
		var analysis = request.body.data;
		var update = super.update.bind(this);

		if(!analysis.analysis) {
			return Promise.resolve(update(request, response, next));
		}

		var analyse = new MongoAnalyse(analysis.analysis, this._connection);
		return analyse.type().then(function(type){
			if (type == "spatialagg") {
				// Verify only when some attributes are present.
				var sourceAttributeSetIsntUsedAsResult = true;
				if (analysis.attributeMap && analysis.attributeMap.length > 0) {
					analysis.attributeMap.forEach(function (attributeToAnalyse) {
						if (attributeToAnalyse.calcAttributeSet == analysis.attributeSet || attributeToAnalyse.normAttributeSet == analysis.attributeSet) {
							sourceAttributeSetIsntUsedAsResult = false;
						}
					});
				}

				if (!sourceAttributeSetIsntUsedAsResult) {
					return next(new Error("Attributes used in the analysis as a source attribute and as a result attributes must be from different attribute sets."));
				}
			}

			return Promise.resolve(update(request, response, next));
		});
	}

	hasRights(user, method, id, object) {
		// Verify permissions for topics for all attribute sets and
		// If user has rights towards at least one topic, it works for all attribute sets.
		return user.hasPermission('topic', method, object.topic);
	}
}

module.exports = AnalysisController;