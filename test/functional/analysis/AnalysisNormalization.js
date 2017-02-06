let should = require('should');

let IntegrationEnvironment = require('../IntegrationEnvironment');
let logger = require('../../../common/Logger').applicationWideLogger;

let PgAnalysisController = require('../../../analysis/PgAnalysisController');

// Create table which serves as the source of the data.
// And another one, which will work as the analytical units.
// In the mongo there must be valid analysis
// Valid layerrefs. Base layerref and data layerref.
describe('Spatial Analysis', () => {
	let integrationEnvironment, fixture = {user: null};
	let pgPool, pgSchema;
	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			pgSchema = schema.schema;
			pgPool = pool;
			new PgAnalysisController(app, pool, mongoDb);

			// Prepare everything necessary
			return mongoDb.collection('attribute').insertMany([{
				_id: 1,
				units: 'm2',
				type: 'numeric'
			}, {
				_id: 2,
				units: 'ha',
				type: 'numeric'
			}, {
				_id: 3,
				units: 'km2',
				type: 'numeric'
			}, {
				_id: 4,
				units: 'm2',
				type: 'numeric'
			}]).then(() => {
				return mongoDb.collection('areaTemplate').insertMany([{
					_id: 1,
					layerType: 'vector'
				},{
					_id: 2,
					layerType: 'au'
				}]);
			}).then(() => {
				return mongoDb.collection('attributeset').insertMany([{
					_id: 1,
					name: 'My Zombies',
					attributes: [1],
					featureLayers: [1]
				}, {
					_id: 2,
					name: 'Enemy Zombies',
					attributes: [2],
					featureLayers: [1]
				}, {
					_id: 3,
					name: 'Dangerous Zombies',
					attributes: [3, 4],
					featureLayers: [1]
				}]);
			}).then(() => {
				return mongoDb.collection('analysis').insertMany([{
					_id: 1,
					type: 'spatialagg',
					name: 'Zombies statistics',
					areaTemplate: 1,
					attributeSet: 3,
					attributeMap: [{  // Sum of zombies over given area.
						attribute: 1,
						attributeSet: 1,
						type: 'sumarea'
					}, { // Average amount of zombies in given area.
						attribute: 1,
						attributeSet: 1,
						type: 'avgarea'
					}, {
						attribute: 2,
						attributeSet: 2,
						normAttribute: 3,
						normAttributeSet: 3,
						type: 'avgattrarea'
					}, {
						attribute: 2,
						attributeSet: 2,
						normAttribute: 3,
						normAttributeSet: 3,
						calcAttribute: 4,
						calcAttributeSet: 3,
						type: 'avgattrattr'
					}]
				}]);

				// Three layerrefs must be created, one for the analytical units, two for the data. One with isData false and second with isData true.
			}).then(() => {
				return pool.query(`CREATE TABLE source_data (as_1_attr_1 double precision, as_1_attr_2 double precision, as_1_attr_3 double precision, as_2_attr_1 double precision, as_3_attr_1 double precision);
					INSERT INTO source_data VALUES (10, 100, 1000, 100, 10);
					CREATE TABLE analytical_units_data (as_1_attr_1 double precision, as_1_attr_2 double precision, as_1_attr_3 double precision, as_2_attr_1 double precision, as_3_attr_1 double precision);
					INSERT INTO analytical_units_data VALUES ()
				`);
			})
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('NormalizationSpec#beforeEach Error: ', error);
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