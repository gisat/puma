let supertest = require('supertest-as-promised');
let should = require('should');

let logger = require('../../../common/Logger').applicationWideLogger;
let Permission = require('../../../security/Permission');
let IntegrationEnvironment = require('../IntegrationEnvironment');

let LayerGeonodeController = require('../../../layers/LayerGeonodeController');
let User = require('../../../security/User');
let PgLayers = require('../../../layers/PgLayers');

describe('LayersGeonode', () => {
	let integrationEnvironment, fixture = {user: null};
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			new LayerGeonodeController(app, pool, schema.schema);

			return pool.query(`
				INSERT INTO ${schema.schema}.layers (id, name, path) VALUES (10, 'TestName', 'TestPath');
				INSERT INTO ${schema.schema}.layers (id, name, path) VALUES (11, 'TestName2', 'TestPath2');
			`).then(() => {
				return mongoDb.collection('layerref').insertMany([{
					_id: 1,
					layer: "geonode:test",
					location: 2,
					year: 1,
					areaTemplate: 1,
					isData: false
				}, {
					_id: 2,
					layer: "geonode:test2",
					location: 2,
					year: 4,
					areaTemplate: 2,
					isData: false
				}, {
					_id: 3,
					layer: "geonode:test2",
					location: 2,
					year: 1,
					areaTemplate: 3,
					isData: false
				}, {
					_id: 4,
					layer: "geonode:test2",
					location: 2,
					year: 1,
					areaTemplate: 4,
					isData: false
				}]);
			}).then(() => {
				return mongoDb.collection('layergroup').insertMany([{
					_id: 1,
					name: 'Group 1',
					priority: 1
				}, {
					_id: 2,
					name: 'Group 2',
					priority: 2
				}])
			}).then(() => {
				return mongoDb.collection('areatemplate').insertMany([{
					_id: 1,
					name: 'Template 1',
					layerGroup: 1
				}, {
					_id: 2,
					name: 'Template 1',
					layerGroup: 2
				}, {
					_id: 3,
					name: 'Template 1'
				}, {
					_id: 4,
					name: 'Template 1',
					layerType: 'au'
				}])
			}).then(() => {
				return mongoDb.collection('location').insertMany([{
					_id: 1,
					dataset: 1
				}, {
					_id: 2,
					dataset: 1
				}, {
					_id: 3,
					dataset: 2
				}]);
			});
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('LayerGeonodeControllerSpec#beforeEach Error: ', error);
		})
	});

	// TODO: Return together with removal of
	xdescribe('#readAll', () => {
		it('returns all layers with access rights from the geonode.', function(done) {
			this.timeout(20000);

			fixture.user = new User(0, [{
				resourceType: 'layer',
				permission: Permission.READ,
				resourceId: 10
			}]);

			supertest(integrationEnvironment.app)
				.get('/rest/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.expect(200)
				.then((response) => {
					should(response.body.data.length).be.exactly(1);
					should(response.body.data[0].id).be.exactly(10);
					done();
				}).catch(err => {
				done(err);
			});
		});
	});

	describe('#add', () => {
		it('adds new layer among those in the database', done => {
			fixture.user = new User(0, [{
				resourceType: 'layer',
				permission: Permission.CREATE
			}]);

			supertest(integrationEnvironment.app)
				.post('/rest/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send({name: 'Surabaya', path: '/test/stet'})
				.expect(200)
				.then((response) => {
					should(response.body.data.name).be.exactly('Surabaya');
					done();
				}).catch(err => {
				done(err);
			});
		});

		it('rejects adding a layer without rights', done => {
			fixture.user = new User(0, []);

			supertest(integrationEnvironment.app)
				.post('/rest/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send({name: 'Surabaya', path: '/test/stet'})
				.expect(403)
				.then((response) => {
					done();
				}).catch(err => {
				done(err);
			});
		});
	});

	describe('#update', () => {
		it('updates existing layer in the database.', done => {
			fixture.user = new User(0, [{
				resourceType: 'layer',
				permission: Permission.UPDATE,
				resourceId: 11
			}]);

			supertest(integrationEnvironment.app)
				.put('/rest/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send({id: 11, name: 'Surabaya', path: '/test/stet'})
				.expect(200)
				.then((response) => {
					should(response.body.data.name).be.exactly('Surabaya');
					done();
				}).catch(err => {
				done(err);
			});
		});

		it('rejects updating layer without permission', done => {
			fixture.user = new User(0, []);

			supertest(integrationEnvironment.app)
				.put('/rest/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send({id: 11, name: 'Surabaya', path: '/test/stet'})
				.expect(403)
				.then(() => {
					done();
				}).catch(err => {
				done(err);
			});
		})
	});

	describe('#delete', () => {
		it('deletes existing layer from the database.', done => {
			fixture.user = new User(0, [{
				resourceType: 'layer',
				permission: Permission.DELETE,
				resourceId: 11
			}]);

			supertest(integrationEnvironment.app)
				.delete('/rest/layer/11')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.expect(200)
				.then(() => {
					return integrationEnvironment.pool.query(`SELECT * FROM ${integrationEnvironment.schema.schema}.${PgLayers.tableName()}`)
				}).then(result => {
					should(result.rows.length).be.exactly(1);
					done();
				}).catch(err => {
				done(err);
			});
		});

		it('rejects deleting layer without permission', done => {
			fixture.user = new User(0, []);

			supertest(integrationEnvironment.app)
				.delete('/rest/layer/11')
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

	xdescribe('#getFiltered', () => {
		it('returns filtered layers available for given combination of stuff', done => {
			fixture.user = new User(0, [{
				resourceType: 'scope',
				permission: Permission.READ,
				resourceId: 1
			}]);

			supertest(integrationEnvironment.app)
				.get('/rest/filtered/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.query({scope: 1, year: [1], place: [2]})
				.expect(200)
				.then((response) => {
					should(response.body.data.length).be.exactly(2);
					done();
				}).catch(err => {
				done(err);
			});
		});

		it('returns filtered layers available for all places if no specified', done => {
			fixture.user = new User(0, [{
				resourceType: 'scope',
				permission: Permission.READ,
				resourceId: 1
			}]);

			supertest(integrationEnvironment.app)
				.get('/rest/filtered/layer')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.query({scope: 1, year: [1]})
				.expect(200)
				.then((response) => {
					should(response.body.data.length).be.exactly(2);
					done();
				}).catch(err => {
				done(err);
			});
		});
	});


	afterEach(done => {
		integrationEnvironment.tearDown().then(() =>{
			done();
		}).catch(error => {
			logger.error(`LayerGeonodeControllerSpec#tearDown Error: `, error);
		});
	});
});