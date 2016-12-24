let config = require('../config');
let os = require('os');
let should = require('should');

let DatabaseSchema = require('../../../postgresql/DatabaseSchema');
let PgPool = require('../../../postgresql/PgPool');
let PgTable = require('../../../data/PgTable');


describe('PgTable', () => {
	let schema, pool;
	let commonSchema = 'data_test';
	let table = new PgTable(`${commonSchema}.migration`);

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
			return pool.pool().query(`insert into ${commonSchema}.migration (name) VALUES ('test')`);
		}).then(() => {
			done();
		}).catch(err => {
			done(err);
		});
	});

	describe('#asSql', () => {
		it('returns correct sql for the full recreation of the table', (done) => {
			if(os.platform() != 'linux') {
				done();
				return;
			}

			table.asSql().then(result => {
				should(result.indexOf('CREATE TABLE') != -1).equal(true);
				should(result.indexOf('COPY migration (id, name) FROM stdin;') != -1).equal(true);
				done();
			}).catch(err => {
				done(err);
			});
		});
	});

	afterEach(done => {
		schema.drop().then(function () {
			done();
		}).catch(err => {
			done(err);
		});
	})
});