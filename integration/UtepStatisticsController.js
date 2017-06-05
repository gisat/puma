let _ = require('underscore');
let logger = require('../common/Logger').applicationWideLogger;
let conn = require('../common/conn');

let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
let FilteredBaseLayers = require('../layers/FilteredBaseLayers');
let MongoLayerReferences = require('../layers/MongoLayerReferences');
let MongoLocations = require('../metadata/MongoLocations');
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
		this._places = new MongoLocations(this._mongo);

		app.get('/rest/integrate/columns', this.import.bind(this));
		app.get('/rest/integrate/country/columns', this.importCountry.bind(this));
		app.get('/rest/integrate/gsi', this.importGsi.bind(this));
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
				isData: false,
				active: true
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
						{"attribute": 5920, "column": "tweet"},
						{"attribute": 5921, "column": "aff_avg_light"},
						{"attribute": 5922, "column": "sum_light"},
						{"attribute": 29029, "column": "rel_aff_area_light"}
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

	importCountry(request, response, next) {
		logger.info('UtepStatisticsController#import started');

		let baseLayers, ids;
		new FilteredMongoLocations({
			dataset: 314
		}, this._mongo).json().then(locations => {
			ids = _.pluck(locations, '_id');
			logger.info('UtepStatisticsController#import All locations: ', ids);
			return new FilteredMongoLayerReferences({
				location: {$in: ids},
				isData: false,
				active: true,
				areaTemplate: 315
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
						{"attribute": 5920, "column": "tweet"},
						{"attribute": 5921, "column": "aff_avg_light"},
						{"attribute": 5922, "column": "sum_light"},
						{"attribute": 29029, "column": "rel_aff_area_light"},

						{"attribute": 32341, "column": "wb_1990_health"},
						{"attribute": 32342, "column": "wb_2000_health"},
						{"attribute": 32343, "column": "wb_2005_health"},
						{"attribute": 32344, "column": "wb_2010_health"},
						{"attribute": 32345, "column": "wb_2015_health"},

						{"attribute": 32346, "column": "un_2000_footprint"},
						{"attribute": 32347, "column": "un_2005_footprint"},
						{"attribute": 32348, "column": "un_2010_footprint"},

						{"attribute": 32349, "column": "wb_1990_urb"},
						{"attribute": 32350, "column": "wb_2000_urb"},
						{"attribute": 32351, "column": "wb_2005_urb"},
						{"attribute": 32352, "column": "wb_2010_urb"},
						{"attribute": 32353, "column": "wb_2015_urb"}
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

	// Create metadata structures in BackOffice and then just map layerrefs. It is the simplest solution.
	// Load the names from the database.
	// Also get all the places and transport them to new scope.
	importGsi(request, response) {
		logger.info(`UtepStatisticsController#importGsi`);
		let locations;
		new FilteredMongoLocations({
			dataset: 314
		}, this._mongo).json().then(pLocations => {
			logger.info(`UtepStatisticsController#importGsi Filtered locations: ${pLocations.length}`);
			locations = pLocations.map(location => {
				location._id = conn.getNextId();
				location.dataset = 38433;
				location.source = 'gsi_integration';
				return location
			});
			return this._mongo.collection('location').insertMany(locations);
		}).then(() => {
			response.json({status: 'ok'});
		});
	}
}

module.exports = UtepStatisticsController;