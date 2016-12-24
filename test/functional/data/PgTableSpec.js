let config = require('../config');

let DatabaseSchema = require('../../../postgresql/DatabaseSchema');
let PgPool = require('../../../postgresql/PgPool');
let PgTable = require('../../../data/PgTable');


describe('PgTable', () => {
	let schema, pool;
	let commonSchema = 'data_test';
	let table = new PgTable(`${commonSchema}.test`);

	beforeEach(done => {
		pool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});

		schema = new DatabaseSchema(pool, commonSchema);
		schema.create().then(() => {
			return pool.pool().query(`insert into ${commonSchema}.groups (name) VALUES ('test')`);
		}).then(() => {
			done();
		});
	});

	describe('#asSql', () => {
		it('returns correct sql for the full recreation of the table', () => {
			table.asSql();
		});
	});

	afterEach(done => {
		schema.drop().then(function () {
			done();
		});
	})
});