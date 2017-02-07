let should = require('should');
let supertest = require('supertest');

let logger = require('../../../common/Logger').applicationWideLogger;

let IntegrationEnvironment = require('../IntegrationEnvironment');

let ImportLayerController = require('../../../layers/ImportLayerController');

describe('ImportLayerSpec', () => {
	let integrationEnvironment, fixture = {user: null};
	let pgPool, pgSchema;
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			pgSchema = schema.schema;
			pgPool = pool;

			new ImportLayerController(app);
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('ImportLayerSpec#beforeEach Error: ', error);
			done(error);
		})
	});

	describe('import', () => {
		it('correctly imports shapefile', function(done) {
			supertest(integrationEnvironment.app)
				.post('/import/layer')
				.attach('administrativeUnits', 'test/functional/layers/fixture/administrativeUnits.zip')
				.expect(200)
				.then(response => {
					done();
				}).catch(error => {
					done(error);
			});
		})
	});

	afterEach(done => {
		integrationEnvironment.tearDown().then(() => {
			done();
		}).catch(error => {
			logger.error(`ImportLayerSpec#tearDown Error: `, error);
			done(error);
		});
	});
});