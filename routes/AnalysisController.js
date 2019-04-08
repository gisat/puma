const LimitedReadAllController = require('./LimitedReadAllController');
const FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
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
class AnalysisController extends LimitedReadAllController {
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

	right(user, method, id, object){
		if(object.createdBy == user.id) {
			return true;
		}

		let attributeSetsIds = [];
		if(object.type == 'fidagg') {
			attributeSetsIds = object.attributeSets || [];
		} else if(object.type == 'math') {
			attributeSetsIds = object.attributeSets || [];
		} else {
			if(object.attributeSet){
				attributeSetsIds.push(object.attributeSet);
			}
			if(object.groupAttributeSet){
				attributeSetsIds.push(object.groupAttributeSet);
			}
		}

		return new FilteredMongoAttributeSets({_id: {$in: attributeSetsIds}}, this._connection).json().then(attributeSets => {
			let permissions = true;
			attributeSets.forEach(attributeSet => {
				if(!user.hasPermission('topic', method, attributeSet.topic)){
					permissions = false;
				}
			});

			return permissions;
		});
	}

	hasRights(user, method, id, object) {
		return true;
	}
}

module.exports = AnalysisController;