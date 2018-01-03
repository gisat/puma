let should = require('should');

let IntegrationEnvironment = require('../IntegrationEnvironment');
let logger = require('../../../common/Logger').applicationWideLogger;

let SsoAuthentication = require('../../../security/SsoAuthentication');

describe('SsoAuthenticationSpec', () => {
	let integrationEnvironment, fixture = {user: null};
	let ssoAuthentication, pgPool, pgSchema;
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			pgSchema = schema.schema;
			pgPool = pool;
			ssoAuthentication = new SsoAuthentication(pool, pgSchema);

			return pool.query(`
				INSERT INTO ${pgSchema}.panther_users (id, email) VALUES (10, 'jakub@balhar.net');
				`);
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('SsoAuthenticationSpec#beforeEach Error: ', error);
		})
	});

	describe('authenticate', () => {
		it('correctly fills userId for existing user', done => {
			let request = {
				headers: {
					"umsso-person-email": 'jakub@balhar.net'
				},
				session: {

				}
			};
			ssoAuthentication.authenticate(request).then(() => {
				should(request.session.userId).equal(10);
				done();
			}).catch(error => {
				done(error);
			});
		});

		it(`correctly creates new user for the user, which isn't yet in the database`, done => {
			let request = {
				headers: {
					"umsso-person-email": 'tom@adamec.name'
				},
				session: {

				}
			};
			ssoAuthentication.authenticate(request).then(() => {
				should(request.session.userId).equal(1);
				done();
			}).catch(error => {
				done(error);
			});
		})

		it(`correctly does nothing when header isn't set`, done => {
			let request = {
				headers: {
					"umsso-person-email": ''
				},
				session: {

				}
			};
			ssoAuthentication.authenticate(request).then(() => {
				should(request.session.userId).equal(undefined);
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
			logger.error(`LayerGeonodeControllerSpec#tearDown Error: `, error);
		});
	})
});