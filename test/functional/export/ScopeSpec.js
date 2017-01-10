let config = require('../config');
let conn = require('../../../common/conn');

let DataFixture = require('./DataFixture');
let DatabaseSchema = require('../../../postgresql/DatabaseSchema');
let Scope = require('../../../export/Scope');
let PgPool = require('../../../postgresql/PgPool');

describe('DataExportController', () => {
	let pool, mongoDb, dataFixture, schema;
	let commonSchema = 'data_test';

	beforeEach(done => {
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
	});

	describe('#export', () => {
		it('correctly exports the scope with all associated data', () => {
			let scopeExporter = new Scope(pool, mongoDb, {
				geonode: commonSchema,
				analysis: commonSchema,
				views: commonSchema
			});
			let result = scopeExporter.exports(1);
			console.log(result);
		})
	});

	describe('#import', () => {

	});

	afterEach(done => {
		// Get rid of this data.
		schema.drop().then(function () {
			return dataFixture.teardown();
		}).then(() => {
			pool.end();
			done();
		}).catch((err) => {
			done(err);
		});
	})
});