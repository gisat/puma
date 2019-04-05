var logger = require('../common/Logger').applicationWideLogger;
var Controller = require('./Controller');
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

	/**
	 * Default implementation of reading all rest objects in this collection. This implementation doesn't verifies anything. If the collection is empty, empty array is returned.
	 * @param request {Request} Request created by the Express framework.
	 * @param request.session.userId {Number} Id of the user who issued the request.
	 * @param response {Response} Response created by the Express framework.
	 * @param next {Function} Function to be called when we want to send it to the next route.
	 */
	readAll(request, response, next) {
		logger.info('Controller#readAll Read all instances of type: ', this.type, ' By User: ', request.session.userId);

		var self = this;
		this.getFilterByScope(request.params.scope).then(filter => {
			crud.read(this.type, filter, {
				userId: request.session.userId,
				justMine: request.query['justMine']
			}, (err, result) => {
				if (err) {
					logger.error("It wasn't possible to read collection:", self.type, " by User: ", request.session.userId, " Error: ", err);
					return next(err);
				}

				let resultsWithRights = [];
				Promise.all(result.map(element => {
					return Promise.all([this.right(request.session.user, Permission.UPDATE, element._id, element),
						this.right(request.session.user, Permission.DELETE, element._id, element)]).then(result => {
							console.log('Rights for element: ', result);
						if (result[0] === true || result[1] === true) {
							resultsWithRights.push(element);
						}
					})

				})).then(() => {
					console.log('Permissions finished ', resultsWithRights);
					return this.permissions.forTypeCollection(this.type, resultsWithRights).then(() => {
						response.json({data: resultsWithRights});
					})
				}).catch(err => {
					logger.error(`Controller#readAll Instances of type ${self.type} Error: `, err);
					response.status(500).json({status: 'err'});
				});
			});
		});
	}

	right(user, method, id, object){
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