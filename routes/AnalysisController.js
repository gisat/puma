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
	constructor(app) {
		super(app, 'analysis', MongoAnalysis, MongoAnalyse);

		this._connection = conn.getMongoDb();
	}

	update(request, response, next) {
		var analysis = request.body.data;
		var update = super.update.bind(this);

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
}

module.exports = AnalysisController;