let supertest = require('supertest');
let should = require('should');

let logger = require('../../../common/Logger').applicationWideLogger;
let Permission = require('../../../security/Permission');
let IntegrationEnvironment = require('../IntegrationEnvironment');

let LayerWmsController = require('../../../layers/wms/LayerWmsController');
let PgWmsLayers = require('../../../layers/wms/PgWmsLayers');
let User = require('../../../security/User');

describe('LayerWmsControllerSpec', () => {
	let integrationEnvironment, fixture = {user: null};
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			new LayerWmsController(app, pool, mongoDb, schema.schema);

			return pool.query(`
				INSERT INTO ${schema.schema}.wms_layers (id, name, url, layer, scope) VALUES (10, 'TestName', 'http://localhost/geoserver/wms', 'guf_75m', 1);
				INSERT INTO ${schema.schema}.wms_layer_has_periods (wms_layer_id, period_id) VALUES (10, 1);
				INSERT INTO ${schema.schema}.wms_layer_has_places (wms_layer_id, place_id) VALUES (10, 1);
				INSERT INTO ${schema.schema}.wms_layers (id, name, url, layer, scope) VALUES (11, 'TestName2', 'http://localhost/geoserver/wms', 'guf12', 1);
				INSERT INTO ${schema.schema}.wms_layer_has_periods (wms_layer_id, period_id) VALUES (11, 1);
				INSERT INTO ${schema.schema}.wms_layer_has_places (wms_layer_id, place_id) VALUES (11, 1);
			`);
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('LayerWmsControllerSpec#beforeEach Error: ', error);
		})
	});

	describe('#readAll', () => {
		it('correctly retrieves all WMS layers', done => {
			fixture.user = new User(0, [{
				resourceType: PgWmsLayers.tableName(),
				permission: Permission.READ,
				resourceId: 10
			}]);

			supertest(integrationEnvironment.app)
				.get('/rest/wms/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.expect(200)
				.then((response) => {
					should(response.body.data.length).be.exactly(1);
					should(response.body.data[0].id).be.exactly(10);
					should(response.body.data[0].periods.length).be.exactly(1);
					should(response.body.data[0].places.length).be.exactly(1);
					done();
				}).catch(err => {
				done(err);
			});
		});
	});

	describe('#add', () => {
		it('correctly adds WMS layer', done => {
			fixture.user = new User(0, [{
				resourceType: PgWmsLayers.tableName(),
				permission: Permission.CREATE,
				resourceId: null
			}]);

			supertest(integrationEnvironment.app)
				.post('/rest/wms/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send({name: 'Eumetsat WMS', url: 'http://geoserver/', scope: 1, places: [1], periods: [1]})
				.expect(200)
				.then((response) => {
					should(response.body.data.name).be.exactly('Eumetsat WMS');
					should(response.body.data.places.length).be.exactly(1);
					should(response.body.data.periods.length).be.exactly(1);
					done();
				}).catch(err => {
				done(err);
			});
		});

		it('rejects adding WMS layer without permission', done => {
			fixture.user = new User(0, []);

			supertest(integrationEnvironment.app)
				.post('/rest/wms/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send({name: 'Eumetsat WMS', url: 'http://geoserver/', scope: 1, places: [1], periods: [1]})
				.expect(403)
				.then(() => {
					done();
				}).catch(err => {
				done(err);
			});
		});
	});

	describe('#update', () => {
		it('correctly updates the WMS layer', done => {
			fixture.user = new User(0, [{
				resourceType: PgWmsLayers.tableName(),
				permission: Permission.UPDATE,
				resourceId: 10
			}]);

			supertest(integrationEnvironment.app)
				.put('/rest/wms/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send({id: 10, name: 'Eumetsat WMS', url: 'http://geoserver/', scope: 1, places: [1], periods: [1]})
				.expect(200)
				.then((response) => {
					should(response.body.data.name).be.exactly('Eumetsat WMS');
					should(response.body.data.places.length).be.exactly(1);
					should(response.body.data.periods.length).be.exactly(1);
					done();
				}).catch(err => {
				done(err);
			});
		});

		it('rejects updating the WMS layers without permissions', done => {
			fixture.user = new User(0, []);

			supertest(integrationEnvironment.app)
				.put('/rest/wms/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send({name: 'Eumetsat WMS', url: 'http://geoserver/', scope: 1, place: 1, period: 1})
				.expect(403)
				.then(() => {
					done();
				}).catch(err => {
				done(err);
			});
		});
	});

	describe('#delete', () => {
		it('correctly deletes the WMS layer', done => {
			fixture.user = new User(0, [{
				resourceType: PgWmsLayers.tableName(),
				permission: Permission.DELETE,
				resourceId: 11
			}]);

			supertest(integrationEnvironment.app)
				.delete('/rest/wms/layer/11')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.expect(200)
				.then(() => {
					return integrationEnvironment.pool.query(`SELECT * FROM ${integrationEnvironment.schema.schema}.${PgWmsLayers.tableName()} WHERE id = 11`)
				}).then(result => {
				should(result.rows.length).be.exactly(0);
				return integrationEnvironment.pool.query(`SELECT * FROM ${integrationEnvironment.schema.schema}.wms_layer_has_periods where wms_layer_id = 11`)
			}).then(result => {
				should(result.rows.length).be.exactly(0);
				return integrationEnvironment.pool.query(`SELECT * FROM ${integrationEnvironment.schema.schema}.wms_layer_has_places where wms_layer_id = 11`)
			}).then(result => {
				should(result.rows.length).be.exactly(0);
				done();
			}).catch(err => {
				done(err);
			});
		});

		it('rejects deleting the WMS layer without permission', done => {
			fixture.user = new User(0, [{
				resourceType: PgWmsLayers.tableName(),
				permission: Permission.DELETE,
				resourceId: 10
			}]);

			supertest(integrationEnvironment.app)
				.delete('/rest/wms/layer/11')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.expect(403)
				.then(() => {
					done();
			}).catch(err => {
				done(err);
			});
		})
	});

	afterEach(done => {
		integrationEnvironment.tearDown().then(() =>{
			done();
		}).catch(error => {
			logger.error(`LayerGeonodeControllerSpec#tearDown Error: `, error);
		});
	});
});