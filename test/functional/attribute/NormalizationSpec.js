let should = require('should');

let IntegrationEnvironment = require('../IntegrationEnvironment');
let logger = require('../../../common/Logger').applicationWideLogger;

let PgNormalization = require('../../../attributes/PgNormalization');

describe('NormalizationSpec', () => {
	let integrationEnvironment, fixture = {user: null};
	let pgNormalization, pgPool, pgSchema;
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			pgSchema = schema.schema;
			pgPool = pool;
			pgNormalization = new PgNormalization(pool, mongoDb, pgSchema);

			return mongoDb.collection('attribute').insertMany([{
				_id: 1,
				units: 'm2'
			}, {
				_id: 2,
				units: 'ha'
			}, {
				_id: 3,
				units: 'km2'
			}]).then(() => {
				return pool.query(`CREATE TABLE ${pgSchema}.an_2345_1 (as_1_attr_1 double precision, as_1_attr_2 double precision, as_1_attr_3 double precision, as_2_attr_1 double precision, as_3_attr_1 double precision);
				INSERT INTO ${pgSchema}.an_2345_1 VALUES (10, 100, 1000, 100, 10);`);
			});
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('NormalizationSpec#beforeEach Error: ', error);
		})
	});

	describe('analysis', () => {
		it('correctly normalizes all attributes in spatial analysis', done => {
			pgNormalization.analysis({
				areaTemplate: 1,
				type: 'spatialagg',
				attributeMap: [{
					attribute: 1,
					attributeSet: 1,
					type: 'sumarea'
				}, {
					attribute: 2,
					attributeSet: 1,
					type: 'avgarea'
				}, {
					attribute: 1,
					attributeSet: 2,
					normAttribute: 3,
					type: 'avgattrarea'
				}, {
					attribute: 1,
					attributeSet: 3,
					normAttribute: 2,
					calcAttribute: 3,
					type: 'avgattrattr'
				}, {
					attribute: 3,
					attributeSet: 1,
					type: 'other'
				}]
			}, {_id: 2345}).then(() => {
				return pgPool.query(`SELECT * FROM ${pgSchema}.an_2345_1`);
			}).then(result => {
				should(result.rows.length).be.exactly(1);
				let row = result.rows[0];
				should(row.as_1_attr_1).be.exactly(10);
				should(row.as_1_attr_2).be.exactly(0.01);
				should(row.as_1_attr_3).be.exactly(1000);
				should(row.as_2_attr_1).be.exactly(0.0001);
				should(row.as_3_attr_1).be.exactly(1000);

				done();
			}).catch(err => {
				logger.error('NormalizationSpec Error: ', err);
				done(err);
			})
		});

		it(`doesn't normalise math analysis`, done => {
			pgNormalization.analysis({
				areaTemplate: 1,
				type: 'math',
				attributeMap: [{
					attribute: 1,
					attributeSet: 1,
					type: 'sumarea'
				}]
			}, {_id: 2345}).then(() => {
				return pgPool.query(`SELECT * FROM ${pgSchema}.an_2345_1`);
			}).then(result => {
				shouldntChange(result.rows);
				done()
			})
		});

		it(`doesn't normalise fidagg analysis`, done => {
			pgNormalization.analysis({
				areaTemplate: 1,
				type: 'fidagg',
				attributeMap: [{
					attribute: 1,
					attributeSet: 1,
					type: 'sumarea'
				}]
			}, {_id: 2345}).then(() => {
				return pgPool.query(`SELECT * FROM ${pgSchema}.an_2345_1`);
			}).then(result => {
				shouldntChange(result.rows);
				done();
			})
		});

		function shouldntChange(rows) {
			should(rows.length).be.exactly(1);
			let row = rows[0];
			should(row.as_1_attr_1).be.exactly(10);
			should(row.as_1_attr_2).be.exactly(100);
			should(row.as_1_attr_3).be.exactly(1000);
			should(row.as_2_attr_1).be.exactly(100);
			should(row.as_3_attr_1).be.exactly(10);
		}
	});

	afterEach(done => {
		integrationEnvironment.tearDown().then(() => {
			done();
		}).catch(error => {
			logger.error(`LayerGeonodeControllerSpec#tearDown Error: `, error);
		});
	})
});