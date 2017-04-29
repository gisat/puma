let _ = require('underscore');
let logger = require('../common/Logger').applicationWideLogger;
let conn = require('../common/conn');

let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
let FilteredBaseLayers = require('../layers/FilteredBaseLayers');
let MongoLayerReferences = require('../layers/MongoLayerReferences');
let PgLayerViews = require('../layers/PgLayerViews');

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

		app.get('/rest/integrate/columns', this.import.bind(this));
	}

	import(request, response, next) {
		logger.info('UtepStatisticsController#import started');

		let baseLayers, ids;
		new FilteredMongoLocations({
			dataset: 314
		}, this._mongo).json().then(locations => {
			ids = _.pluck(locations, '_id');
			logger.info('UtepStatisticsController#import All locations: ', ids);
			return new FilteredMongoLayerReferences({
				location: {$in: ids},
				isData: false
			}, this._mongo).json();
		}).then(pBaseLayers => {
			baseLayers = pBaseLayers;
			logger.info('UtepStatisticsController#import Base Layers: ', baseLayers.length);

			return new FilteredMongoLayerReferences({
				attributeSet: 5900,
				location: {$in: ids},
				isData: true
			}, this._mongo).read();
		}).then(layerRefsToDelete => {
			logger.info('UtepStatisticsController#import Layers to remove: ', layerRefsToDelete.length);
// For given attribute set map all attributes by deleting layerref for this attribute set.
			return Promise.all(layerRefsToDelete.map(layerRef => {
				return this._layerReferences.remove(layerRef);
			}));
		}).then(() => {
			logger.info('UtepStatisticsController#import Add layerrefs');
			// Create and add layerref for every base layer.
			return Promise.all(baseLayers.map(baseLayer => {
				this._layerReferences.add({
					_id: conn.getNextId(),
					"isData": true,
					"layer": baseLayer.layer,
					"location": baseLayer.location,
					"year": baseLayer.year,
					"columnMap": [
						{"attribute": 5901, "column": "worldpop"},
						{"attribute": 5904, "column": "gpw_v4"},
						{"attribute": 4312, "column": "guf12m"},
						{"attribute": 5920, "column": "tweet"}
						/*,{"attribute": , "column": "avg_light"},
						{"attribute": , "column": "sum_light"}*/
					],
					"attributeSet": 5900,
					"active": true,
					"areaTemplate": baseLayer.areaTemplate,
					"fidColumn": baseLayer.fidColumn,
					"dataSourceOrigin": baseLayer.dataSourceOrigin
				});
			}));
		}).then(() => {
			logger.info('UtepStatisticsController#import Update views');
			// Update all relevant views. Do it one by one.
			var promise = Promise.resolve(null);
			baseLayers.forEach(baseLayer => {
				promise = promise.then(() => {
					return new FilteredMongoLayerReferences({
						"layer": baseLayer.layer,
						"location": baseLayer.location,
						"year": baseLayer.year,
						"areaTemplate": baseLayer.areaTemplate,
						"isData": true
					}, this._mongo).read();
				}).then(layerReferences => {
					return this._layerViews.update(baseLayer._id, layerReferences);
				})
			});
			return promise;
		}).then(() => {
			logger.info('UtepStatisticsController#import Done');
			response.json({status: 'ok'});
		}).catch(err => {
			logger.error('UtepStatisticsController#import Error: ', err);
		});
	}

	recreateViews(request, response, next) {

	}
}

module.exports = UtepStatisticsController;