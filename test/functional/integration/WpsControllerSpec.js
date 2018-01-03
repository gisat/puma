let should = require('should');

let logger = require('../../../common/Logger').applicationWideLogger;

let IntegrationEnvironment = require('../IntegrationEnvironment');

let WpsController = require('../../../integration/WpsController');

describe('WpsControllerSpec', () => {
	let integrationEnvironment, fixture = {user: null};
	let pgPool, pgSchema;
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			pgSchema = schema.schema;
			pgPool = pool;

			new WpsController(app, pool, mongoDb);
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('AnalyticalUnitsControllerSpec#beforeEach Error: ', error);
			done(error);
		})
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