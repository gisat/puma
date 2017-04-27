let supertest = require('supertest-as-promised');
let should = require('should');

let logger = require('../../../common/Logger').applicationWideLogger;

let IntegrationEnvironment = require('../IntegrationEnvironment');

let UtepStatisticsController = require('../../../integration/UtepStatisticsController');

describe('UtepStatisticsController', () => {
	let integrationEnvironment, fixture = {user: null};
	let pgPool, pgSchema;
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			pgSchema = schema.schema;
			pgPool = pool;

			new UtepStatisticsController(app, pool, mongoDb, pgSchema);

			return mongoDb.collection("dataset").insertMany([{
				_id: 314,
				active: true
			}]).then(() => {
				return mongoDb.collection("location").insertMany([{
					"_id": 101,
					"active": true,
					"name": "Czech republic",
					"bbox": "10.8765,48.5457,18.8635,51.0483",
					"dataset": 314
				},{
					"_id": 102,
					"active": true,
					"name": "Czech republic",
					"bbox": "10.8765,48.5457,18.8635,51.0483",
					"dataset": 314
				},{
					"_id": 103,
					"active": true,
					"name": "Czech republic",
					"bbox": "10.8765,48.5457,18.8635,51.0483",
					"dataset": 314
				}])
			}).then(() => {
				// Add three base layer refs. One with data, second without data.
				return mongoDb.collection("layerref").insertMany([{
					"_id": 1010,
					"layer": "geonode:import_layer1",
					"location": 101,
					"year": 6,
					"active": true,
					"areaTemplate": 8,
					"isData": false,
					"fidColumn": "fid",
					"dataSourceOrigin": "geonode"
				}, {
					"_id": 1013,
					"layer": "geonode:import_layer1",
					"location": 101,
					"year": 6,
					"columnMap": [
						{"attribute": 910, "column": "AREA"}
					],
					"attributeSet": 5900,
					"active": true,
					"areaTemplate": 8,
					"isData": true,
					"fidColumn": "fid",
					"dataSourceOrigin": "geonode"
				}, {
					"_id": 1011,
					"layer": "geonode:import_layer2",
					"location": 102,
					"year": 6,
					"active": true,
					"areaTemplate": 8,
					"isData": false,
					"fidColumn": "fid",
					"dataSourceOrigin": "geonode"
				}, {
					"_id": 1012,
					"layer": "geonode:import_layer3",
					"location": 103,
					"year": 6,
					"active": true,
					"areaTemplate": 8,
					"isData": false,
					"fidColumn": "fid",
					"dataSourceOrigin": "geonode"
				}]);
			}).then(() => {
				return pool.query(`
					CREATE TABLE ${pgSchema}.base_1010(gid bigint, centroid geometry, area double precision, length double precision, extent box2d);
					CREATE TABLE ${pgSchema}.base_1011(gid bigint, centroid geometry, area double precision, length double precision, extent box2d);
					CREATE TABLE ${pgSchema}.base_1012(gid bigint, centroid geometry, area double precision, length double precision, extent box2d);
					
					CREATE TABLE ${pgSchema}.import_layer1 (fid integer, the_geom geometry, worldpop integer, gpw_v4 integer, guf12m integer, tweet integer);
					CREATE TABLE ${pgSchema}.import_layer2 (fid integer, the_geom geometry, worldpop integer, gpw_v4 integer, guf12m integer, tweet integer);
					CREATE TABLE ${pgSchema}.import_layer3 (fid integer, the_geom geometry, worldpop integer, gpw_v4 integer, guf12m integer, tweet integer);
				`);
			})
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('AnalyticalUnitsControllerSpec#beforeEach Error: ', error);
			done(error);
		})
	});

	describe('import', () => {
		it('correctly recreates database', done => {
			supertest(integrationEnvironment.app)
				.get('/rest/integrate/columns')
				.query({})
				.then(() => {
					done();
				}).catch(error => {
				done(error);
			})
		});
	});

	afterEach(done => {
		integrationEnvironment.tearDown().then(() => {
			done();
		}).catch(error => {
			logger.error(`AnalyticalUnitsControllerSpec#tearDown Error: `, error);
			done(error);
		});
	});

});