let express = require('express');
let config = require('../config');
let conn = require('../../../common/conn');

let DataFixture = require('./DataFixture');
let DatabaseSchema = require('../../../postgresql/DatabaseSchema');
let DataExportController = require('../../../export/DataExportController');
let PgPool = require('../../../postgresql/PgPool');

describe('DataExportController', () => {
	let pool, mongoDb, dataFixture, server, schema;
	let commonSchema = 'data_test';

	beforeEach(done => {
		app = express();
		app.use(express.bodyParser());

		pool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});

		conn.connectToMongo(config.mongoConnString).then(function (db) {
			mongoDb = db;

			dataFixture = new DataFixture(db, pool, commonSchema);
			// Creat the fixture with scopes, locations and other necessary stuff.

			schema = new DatabaseSchema(pool, commonSchema);
			return schema.create();
		}).then(function () {
			return dataFixture.setup();
		}).then(function () {
			done();
		}).catch((err) => {
			done(err);
		});

		new DataExportController(app, pool, {
			geonode: commonSchema,
			analysis: commonSchema,
			views: commonSchema
		});

		server = app.listen(config.port, function () {
			console.log('DataExportController app is listening\n');
		});
		// Prepare mongo db as well as postgreSql db with data for correct export.
	});

	describe('#export', () => {
		it('correctly exports the scope with all associated data', () => {

		})
	});

	describe('#import', () => {

	});

	afterEach(done => {
		// Get rid of this data.
		schema.drop().then(function () {
			server.close();
			return dataFixture.teardown();
		}).then(() => {
			done();
		}).catch((err) => {
			done(err);
		});
	})
});