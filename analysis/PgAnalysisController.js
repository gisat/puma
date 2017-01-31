let Promise = require('promise');

let logger = require('../common/Logger').applicationWideLogger;
let UUID = require('../common/UUID');

let spatial = require('./spatialagg');
let math = require('./math');
let fidagg = require('./fidagg');

let MongoPerformedAnalysis = require('./MongoPerformedAnalysis');
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
	constructor(app, pool, mongo) {
		this._runningAnalysis = {};

		this._performedAnalysis = new MongoPerformedAnalysis(mongo);
		this._pool = pool;
		this._mongo = mongo;
		this._normalization = new PgNormalization(pool);

		app.post('/rest/run/analysis', this.create.bind(this));
		app.delete('/rest/run/analysis', this.remove.bind(this));
		app.get('/rest/run/analysis/:id', this.status.bind(this));
	}

	/**
	 * It creates new analysis.
	 * @param request
	 * @param response
	 */
	create(request, response) {
		let uuid = new UUID().toString();
		this._runningAnalysis[uuid] = "Started";

		let performedAnalysis = request.body.data;
		let analysis, running, mapOfLayerReferences;
		new FilteredMongoAnalysis({_id: performedAnalysis.analysis}).json().then(pAnalysis => {
			analysis = pAnalysis;
			return new Promise((resolve, reject) => {
				let type = analysis.type;
				if(type == 'spatial') {
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
			return this._performedAnalysis.add(performedAnalysis);
		}).then(performedAnalysis => {
			performedAnalysis.id = uuid;
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
			if(analysis.type == 'spatial') {
				// Only for spatial.
				return this._normalization.analysis(analysis, performedAnalysis);
			} else {
				return null;
			}
		}).catch(err => {
			this._runningAnalysis[uuid] = "Error";
			logger.error(`PgAnalysisController#create Error: `, err);
			response.status(500).json({status: 'err'});
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

	/**
	 * It returns status of analysis.
	 * @param request
	 * @param response
	 */
	status(request, response) {
		let id = request.params.id;

		if (!id) {
			logger.error("PgAnalysisController#status Status analysis request didn't contain id.");
			response.status(400).json({
				message: "Status analysis request didn't contain id"
			});
			return;
		}

		if (!this._runningAnalysis[id]) {
			logger.error("PgAnalysisController#status There is no running analysis with id", id);
			response.status(400).json({
				message: "There is no running analysis with id " + id
			});
			return;
		}

		logger.info("PgAnalysisController#status  Requested status of task: ", id);

		response.json({
			status: this._runningAnalysis[id]
		});
	}
}

module.exports = PgAnalysisController;