let Promise = require('promise');

let logger = require('../common/Logger').applicationWideLogger;
let conn = require('../common/conn');

let spatial = require('./spatialagg');
let math = require('./math');
let fidagg = require('./fidagg');

let MongoPerformedAnalysis = require('./MongoPerformedAnalysis');
let MongoPerformedAnalyse = require('./MongoPerformedAnalyse');
let FilteredMongoAnalysis = require('./FilteredMongoAnalysis');
let PgNormalization = require('../attributes/PgNormalization');

/**
 * It handles running of the analysis. It means checking the prerequisites, running the analysis, handling status
 * calls and normalizing the result based on the units.
 */
class PgAnalysisController {
	/**
	 *
	 * @param app
	 * @param pool
	 * @param mongo
	 */
	constructor(app, pool, mongo, schema) {
		this._runningAnalysis = {};

		this._performedAnalysis = new MongoPerformedAnalysis(mongo);
		this._pool = pool;
		this._mongo = mongo;
		this._normalization = new PgNormalization(pool, mongo, 'analysis');

		app.post('/rest/run/analysis', this.create.bind(this));
		app.delete('/rest/run/analysis', this.remove.bind(this));
	}

	/**
	 * It creates new analysis.
	 * @param request
	 * @param response
	 */
	create(request, response) {
		let id = conn.getNextId();
		this._runningAnalysis[id] = "Started";

		let performedAnalysis = request.body.data;
		let analysis, running, mapOfLayerReferences;
		let sent = false;
		new FilteredMongoAnalysis({_id: performedAnalysis.analysis}, this._mongo).json().then(pAnalysis => {
			analysis = pAnalysis[0];
			return new Promise((resolve, reject) => {
				let type = analysis.type;
				if(type == 'spatialagg') {
					running = spatial;
				} else if(type == 'math') {
					running = math;
				} else if(type == 'fidagg') {
					running = fidagg;
				} else {
					reject(
						logger.warn(`PgAnalysisController#create Wrong type of analysis. Type: ${type}`)
					);
				}
				running.check(analysis, performedAnalysis, (err, results) => {
					if(err) {
						reject(
							logger.error("PgAnalysisController#create Check for analysis of type: ", type, " Failed. Analysis: ", analysis,
							" Parameters to perform analysis: ", performedAnalysis, " Error: ", err)
						);
					} else {
						resolve(results);
					}
				})
			})
		}).then(pMapOfLayerReferences => {
			mapOfLayerReferences = pMapOfLayerReferences;
			performedAnalysis._id = id;
			return this._performedAnalysis.add(performedAnalysis);
		}).then(() => {
			sent = true;
			response.json({data: performedAnalysis});

			// This is long running operation. The clients don't wait for the result.
			return new Promise((resolve, reject) => {
				running.perform(analysis, performedAnalysis, mapOfLayerReferences, request, (err) => {
					if(err) {
						reject(
							logger.error('PgAnalysisController#create Analysis ', analysis, ' failed. Error: ', err)
						);
					} else {
						resolve();
					}
				})
			});
		}).then(() => {
			if(analysis.type == 'spatialagg') {
				// Only for spatial.
				performedAnalysis._id = id;
				return this._normalization.analysis(analysis, performedAnalysis);
			} else {
				return null;
			}
		}).catch(err => {
			logger.error(`PgAnalysisController#create Error: `, err);

			performedAnalysis.status = "Failed. " + err;
			performedAnalysis.finished = new Date();
			performedAnalysis._id = id;
			this._performedAnalysis.update(performedAnalysis);

			if(!sent){
				response.status(500).json({status: 'err'});
			}
		});
	}

	/**
	 * It removes existing analysis.
	 * @param request
	 * @param response
	 */
	remove(request, response) {
		// Not supported yet.
		response.status(400).json({status: 'Not supported yet'});
	}
}

module.exports = PgAnalysisController;