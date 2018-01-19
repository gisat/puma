let supertest = require('supertest');
let should = require('should');

let logger = require('../../../common/Logger').applicationWideLogger;

let IntegrationEnvironment = require('../IntegrationEnvironment');
let ValidScope = require('../ValidScope');

let IntegrationScope = require('../../../integration/IntegrationScope');
let MongoScope = require('../../../metadata/MongoScope');
let Permission = require('../../../security/Permission');
let User = require('../../../security/User');

describe('IntegrationScope', () => {
	let integrationEnvironment, fixture = {user: null};
	let pgPool, pgSchema, mongo, user, validScope;
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			pgSchema = schema.schema;
			pgPool = pool;
			mongo = mongoDb;
			user = new User(0, [{
				resourceType: MongoScope.collectionName(),
				permission: Permission.READ,
				resourceId: 10
			}, {
				resourceType: MongoScope.collectionName(),
				permission: Permission.READ,
				resourceId: 10
			}, {
				resourceType: MongoScope.collectionName(),
				permission: Permission.READ,
				resourceId: 10
			}]);
			validScope = new ValidScope(mongo);
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('AnalyticalUnitsControllerSpec#beforeEach Error: ', error);
			done(error);
		})
	});

	describe('create', () => {
		it('creates new scope', done => {
			new IntegrationScope(mongo, pgPool, pgSchema, user, 'Test', 1000).json().then(result => {
				return validScope.verify(result);
			}).then(exists => {
				should(exists).be.exactly(true);
				done();
			}).catch(err => {
				done(err);
			});
		});
	});

	describe('scope', () => {
		let scope;
		beforeEach(done => {
			validScope.create(1000).then(pScope => {
				scope = pScope;
				done()
			}).catch(err => {
				done(err);
			});
		});

		it('returns existing scope the user has rights to.', done => {
			user = new User(0, [{
				resourceType: MongoScope.collectionName(),
				permission: Permission.READ,
				resourceId: scope.scope
			}, {
				resourceType: MongoScope.collectionName(),
				permission: Permission.READ,
				resourceId: scope.scope
			}, {
				resourceType: MongoScope.collectionName(),
				permission: Permission.READ,
				resourceId: scope.scope
			}]);
			new IntegrationScope(mongo, pgPool, pgSchema, user, 'Some Name', 1000).json().then(result => {
				return validScope.verify(result);
			}).then(exists => {
				should(exists).be.exactly(true);
				done();
			}).catch(err => {
				done(err);
			});
		});

		it('create new scope when the user doesnt have permissions', done => {
			user = new User(0, []);
			new IntegrationScope(mongo, pgPool, pgSchema, user, 'Some Name', 1000).json().then(result => {
				return validScope.verify(result);
			}).then(exists => {
				should(exists).be.exactly(true);
				done();
			}).catch(err => {
				done(err);
			});
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