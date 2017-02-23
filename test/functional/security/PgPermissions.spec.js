let should = require('should');

let IntegrationEnvironment = require('../IntegrationEnvironment');
let logger = require('../../../common/Logger').applicationWideLogger;

let PgPermissions = require('../../../security/PgPermissions');
let Permission = require('../../../security/Permission');

describe('NormalizationSpec', () => {
	let integrationEnvironment, fixture = {user: null};
	let pgPermissions, pgPool, pgSchema;
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			pgSchema = schema.schema;
			pgPool = pool;
			pgPermissions = new PgPermissions(pool, pgSchema);

			return pool.query(`
				INSERT INTO ${pgSchema}.permissions (id, user_id, resource_id, resource_type, permission) VALUES (1, 1, 1, 'layer', '${Permission.READ}');
				INSERT INTO ${pgSchema}.permissions (id, user_id, resource_id, resource_type, permission) VALUES (2, 2, 1, 'layer', '${Permission.READ}');
				INSERT INTO ${pgSchema}.permissions (id, user_id, resource_id, resource_type, permission) VALUES (3, 1, 2, 'layer', '${Permission.READ}');
				INSERT INTO ${pgSchema}.group_permissions (id, group_id, resource_id, resource_type, permission) VALUES (1, 1, 1, 'layer', '${Permission.READ}');
				INSERT INTO ${pgSchema}.group_permissions (id, group_id, resource_id, resource_type, permission) VALUES (2, 2, 1, 'layer', '${Permission.READ}');
				INSERT INTO ${pgSchema}.group_permissions (id, group_id, resource_id, resource_type, permission) VALUES (3, 1, 2, 'layer', '${Permission.READ}');
				`);
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('NormalizationSpec#beforeEach Error: ', error);
		})
	});

	describe('forTypeCollection', () => {
		it('returns resources with the information about everyone who has access rights. Multiple objects in collection', done => {
			pgPermissions.forTypeCollection('layer', [{id: 1}, {id: 2}]).then(objectWithPermissions => {
				should(objectWithPermissions.length).equal(2); // Permissions for two objects received

				should(objectWithPermissions[0].id).equal(1);
				should(objectWithPermissions[0].permissions.user.length).equal(2);
				should(objectWithPermissions[0].permissions.group.length).equal(2);

				should(objectWithPermissions[1].id).equal(2);
				should(objectWithPermissions[1].permissions.user.length).equal(1);
				should(objectWithPermissions[1].permissions.group.length).equal(1);

				done();
			}).catch(err => {
				done(err);
			});
		});

		it('returns resources with the information about everyone who has access rights. Single object in collection', done => {
			pgPermissions.forTypeCollection('layer', [{id: 1}]).then(objectWithPermissions => {
				should(objectWithPermissions.length).equal(1);

				should(objectWithPermissions[0].id).equal(1);
				should(objectWithPermissions[0].permissions.user.length).equal(2);
				should(objectWithPermissions[0].permissions.group.length).equal(2);

				done();
			}).catch(err => {
				done(err);
			});
		});

		it('returns empty array when no resources are supplied', done => {
			pgPermissions.forTypeCollection('layer', []).then(objectWithPermissions => {
				should(objectWithPermissions.length).equal(0);

				done();
			}).catch(err => {
				done(err);
			});
		});

		it('returns empty array when no resources with id are supplied', done => {
			pgPermissions.forTypeCollection('layer', [{_id: 1}]).then(objectWithPermissions => {
				should(objectWithPermissions.length).equal(0);

				done();
			}).catch(err => {
				done(err);
			});
		});

		it('returns permissions only for object with supplied id.', done => {
			pgPermissions.forTypeCollection('layer', [{_id: 1}, {id: 2}]).then(objectWithPermissions => {
				should(objectWithPermissions.length).equal(1);

				should(objectWithPermissions[0].id).equal(2);
				should(objectWithPermissions[0].permissions.user.length).equal(1);
				should(objectWithPermissions[0].permissions.group.length).equal(1);

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
			logger.error(`LayerGeonodeControllerSpec#tearDown Error: `, error);
		});
	})
});