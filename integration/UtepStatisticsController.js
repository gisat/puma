let _ = require('underscore');
let logger = require('../common/Logger').applicationWideLogger;
let conn = require('../common/conn');

let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredBaseLayers = require('../layers/FilteredBaseLayers');
let MongoLayerReferences = require('../layers/MongoLayerReferences');
let MongoLocation = require('../metadata/MongoLocation');
let MongoLocations = require('../metadata/MongoLocations');
let PgLayerViews = require('../layers/PgLayerViews');

let Group = require('../security/Group');
let PgPermissions = require('../security/PgPermissions');
let Permission = require('../security/Permission');

let PgSequentialQuery = require('../postgresql/PgSequentialQuery');

/**
 * Utility class for implementation of the data into the World Scope
 * Automate mapping of the columns to the reality.
 */
class UtepStatisticsController {
	constructor(app, pool, mongo, targetSchema, schema) {
		this._pool = pool;
		this._mongo = mongo;

		this._layerReferences = new MongoLayerReferences(this._mongo);
		this._layerViews = new PgLayerViews(pool, targetSchema, schema);
		this._places = new MongoLocations(this._mongo);
		this._permissions = new PgPermissions(pool, schema);

		app.get('/rest/integrate/gsi', this.importCountry.bind(this));
	}

	importCountry(request, response, next) {
		logger.info('UtepStatisticsController#import started');

		new FilteredMongoLocations({
			dataset: 38433
		}, this._mongo).json().then(locations => {
			let sqls = locations.map(location => {
				return this._permissions.addGroupSql(Group.userId(), MongoLocation.collectionName(), location._id, Permission.READ);
			});
			return new PgSequentialQuery(this._pool).handleSetOfQueries(sqls);
		}).then(() => {
			response.json({
				status: 'ok'
			})
		}).catch(err => {
			logger.error('UtepStatisticsController#import Error: ', err);
		});
	}
}

module.exports = UtepStatisticsController;