let should = require('should');
let supertest = require('supertest-as-promised');
let conn = require('../../../common/conn');

let moment = require('moment');
let express = require('express');

let PgPool = require('../../../postgresql/PgPool');
let DatabaseSchema = require('../../../postgresql/DatabaseSchema');
let LocationController = require('../../../routes/LocationController');
let User = require('../../../security/User');
let PgUsers = require('../../../security/PgUsers');
let PermissionFixture = require('../security/PermissionFixture');

let config = require('../config');

describe('Place', () => {
	// TODO move to the create test server.
	let schema, pool, app;
	let commonSchema = 'data_test';
	let mongoDb;
	let permissionFixture;
	let fixture = {user: null};
	let server;
	// Cleanse the database.
	beforeEach(function (done) {
		app = express();
		app.use(express.bodyParser());
		app.use((request, response, next) => {
			request.session = {};
			request.session.userId = 1;
			request.session.user = fixture.user;
			next();
		});

		pool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});

		conn.connectToMongo(config.mongoConnString).then(function (db) {
			mongoDb = db;

			schema = new DatabaseSchema(pool, commonSchema);
			permissionFixture = new PermissionFixture(db, pool, commonSchema);
			return schema.create();
		}).then(() => {
			return permissionFixture.setup();
		}).then(() => {
			done();
		}).catch(err => {
			done(err)
		});

		new LocationController(app, pool, commonSchema);
		server = app.listen(config.port, function () {
			console.log('Group app is listening\n');
		});
	});

	describe('readAll', () => {
		it('returns all', done => {
			fixture.user = new User(0, [{
				resourceType: 'location',
				permission: 'GET',
				resourceId: 8
			}, {
				resourceType: 'location',
				permission: 'GET',
				resourceId: 9
			}, {
				resourceType: 'location',
				permission: 'GET',
				resourceId: 10
			}, {
				resourceType: 'location',
				permission: 'GET',
				resourceId: 11
			}, {
				resourceType: 'location',
				permission: 'GET',
				resourceId: 12
			}, {
				resourceType: 'location',
				permission: 'GET',
				resourceId: 13
			}, {
				resourceType: 'dataset',
				permission: 'GET',
				resourceId: 1
			}, {
				resourceType: 'dataset',
				permission: 'GET',
				resourceId: 6
			}, {
				resourceType: 'dataset',
				permission: 'GET',
				resourceId: 7
			}]);
			supertest(app)
				.get('/rest/location')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.expect(200)
				.then((response) => {
					should(response.body.data.length).be.exactly(6);
					should(response.body.data[0].permissions.group.length).be.exactly(1);
					should(response.body.data[1].permissions.group.length).be.exactly(1);
					should(response.body.data[2].permissions.user.length).be.exactly(1);
					should(response.body.data[3].permissions.user.length).be.exactly(1);
					should(response.body.data[4].permissions.group.length).be.exactly(1);
					should(response.body.data[5].permissions.user.length).be.exactly(1);
					done();
				}).catch(err => {
				done(err);
			});
		})
	});

	afterEach(function (done) {
		schema.drop().then(() => {
			server.close();
		}).then(() => {
			permissionFixture.teardown();
			done();
		}).catch(err => {
			done(err);
		});
	});
});