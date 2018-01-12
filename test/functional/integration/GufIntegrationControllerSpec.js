let supertest = require('supertest-as-promised');
let should = require('should');

let logger = require('../../../common/Logger').applicationWideLogger;

let IntegrationEnvironment = require('../IntegrationEnvironment');

let GufIntegrationController = require('../../../integration/GufIntegrationController');

describe('GufIntegrationController', () => {
	let integrationEnvironment, fixture = {user: null};
	let pgPool, pgSchema;
	let controller;
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			pgSchema = schema.schema;
			pgPool = pool;

			controller = new GufIntegrationController(app, pool, mongoDb, null, pgSchema);
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('AnalyticalUnitsControllerSpec#beforeEach Error: ', error);
			done(error);
		})
	});

	describe('createAdministrativeUnit', () => {
		it('correctly recognizes extent', done => {
			controller.createAdministrativeUnit('test/functional/integration/gufde.tif', pgSchema + '.adm_1').then(result => {
				should(result.box).be.exactly('8.60566676234157,48.780556097881345,8.82155565363064,48.967444988848');
				done();
			}).catch(err => {
				done(err);
			});
		});
	});

	describe('process', () => {

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