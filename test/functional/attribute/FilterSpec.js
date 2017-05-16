let supertest = require('supertest-as-promised');
let should = require('should');

let logger = require('../../../common/Logger').applicationWideLogger;

let IntegrationEnvironment = require('../IntegrationEnvironment');
let ValidLayers = require('../ValidLayers');

let AttributeController = require('../../../routes/AttributeController');

describe('FilterSpec', () => {
	let integrationEnvironment, fixture = {user: null};
	let pgPool, pgSchema;
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			pgSchema = schema.schema;
			pgPool = pool;

			new AttributeController(app, pool, null, pgSchema);

			return mongoDb.collection("dataset").insertMany([{
				_id: 314,
				active: true
			}]).then(() => {
				// Create attribute
				// Create attribute set
				// Create area template
				return mongoDb.collection("location").insertMany([{
					"_id": 101,
					"active": true,
					"name": "Czech republic",
					"bbox": "10.8765,48.5457,18.8635,51.0483",
					"dataset": 314
				}])
			}).then(() => {
				// Create attribute
				// Create attribute set
				// Create area template
				return mongoDb.collection("attribute").insertMany([{
					"_id": 10000,
					"name": "Population",
					"active": false,
					"type": "numeric",
					"standardUnits": 'm2',
					"color": "#aaaa00"
				}, {
					"_id": 10001,
					"name": "Area",
					"active": false,
					"type": "numeric",
					"standardUnits": 'm2',
					"color": "#0000ff"
				}])
			}).then(() => {
				return new ValidLayers(pool, mongoDb, pgSchema, pgSchema).add(1, 'analytical_units_1', [{
					attribute: 10000,
					column: 'population',
					type: 'int'
				}, {attribute: 10001, column: 'area', type: 'int'}],
					// Follows the values for rows.
					[[2, 7], [8, 5], [4, 10], [12, 13]],
					101, 6, 8, 201);
			})
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('AnalyticalUnitsControllerSpec#beforeEach Error: ', error);
			done(error);
		})
	});

	describe('statistics', () => {
		it('correctly receives statistics', done => {
			supertest(integrationEnvironment.app)
				.post('/rest/filter/attribute/statistics')
				.send({
					areaTemplate: 8,
					periods: [6],
					places: [101],
					attributes: [{
						attribute: 10000,
						attributeName: 'Some Name',
						attributeSet: 201,
						attributeSetName: 'Name of the attribute set',
						standardUnits: 'm2',
						units: 'm2',
						active: true
					}, {
						attribute: 10001,
						attributeName: 'Some Name 2',
						attributeSet: 201,
						attributeSetName: 'Name of the attribute set',
						standardUnits: 'm2',
						units: 'm2',
						active: true
					}],
					distribution: {
						type: 'normal',
						classes: 3
					}
				})
				.then(response => {
					let attributes = response.body.attributes;
					should(attributes.length).be.exactly(2);
					should(attributes[0].max).be.exactly(12);
					should(attributes[0].min).be.exactly(2);
					should(attributes[0].distribution[0]).be.exactly(2);
					should(attributes[0].distribution[1]).be.exactly(1);
					should(attributes[0].distribution[2]).be.exactly(1);
					should(attributes[1].max).be.exactly(13);
					should(attributes[1].min).be.exactly(5);
					should(attributes[1].distribution[0]).be.exactly(2);
					should(attributes[1].distribution[1]).be.exactly(1);
					should(attributes[1].distribution[2]).be.exactly(1);
					done();
				}).catch(error => {
				done(error);
			})
		});
	});

	describe('filter', () => {
		it('correctly receives rows satisfying the limitation combination of the information.', done => {
			supertest(integrationEnvironment.app)
				.post('/rest/filter/attribute/filter')
				.send({
					areaTemplate: 8,
					periods: [6],
					places: [101],
					attributes: [{
						attribute: 10000,
						attributeSet: 201,
						value: [0, 20]
					}, {
						attribute: 10001,
						attributeSet: 201,
						value: [4, 6]
					}]
				})
				.then(response => {
					should(response.body.length).be.exactly(1);
					should(response.body[0].at).be.exactly(8);
					should(response.body[0].gid).be.exactly(1);
					should(response.body[0].loc).be.exactly(101);
					done();
				}).catch(error => {
				done(error);
			})
		});
	});

	describe('amount', () => {
		it('correctly receives amount of rows satisfying the limitation combination of the information on amount.', done => {
			supertest(integrationEnvironment.app)
				.post('/rest/filter/attribute/amount')
				.send({
					areaTemplate: 8,
					periods: [6],
					places: [101],
					attributes: [{
						attribute: 10000,
						attributeSet: 201,
						value: [0, 20]
					}, {
						attribute: 10001,
						attributeSet: 201,
						value: [4, 6]
					}]
				})
				.then(response => {
					should(response.body.amount).be.exactly(1);
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