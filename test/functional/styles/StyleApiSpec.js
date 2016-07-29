var should = require('should');
var supertest = require('supertest-as-promised');

var express = require('express');

var PgPool = require('../../../common/PgPool');
var DatabaseSchema = require('../../../postgresql/DatabaseSchema');
var RestStyle = require('../../../styles/RestStyle');
var StyleController = require('../../../routes/StyleController');
var config = require('../config');

describe('StyleApi', function () {
	// TODO move to the create test server.
	var schema, pool, app;
	var commonSchema = 'data_test';
	var createdStyle;
	// Cleanse the database.
	before(function (done) {
		app = express();
		app.use(express.bodyParser());

		pool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});

		schema = new DatabaseSchema(pool, commonSchema);
		schema.create().then(function () {
			done();
		});

		new StyleController(app, pool, commonSchema);
		app.listen(config.port, function () {
			console.log('App is listening');
		});
	});

	it('should create and then read created style via the API', function (done) {
		var style = {
			definition: {
				"type": "polygon", // PolygonSymbolizer
				"filterAttributeKey": 5, // Filter id of attributeset, PropertyName
				"filterAttributeSetKey": 2, // Id of attributeset which contains attributes for rules.
				"filterType": "attributeCsv", // Comma separated values
				"rules": [
					{
						"name": "Urban fabric", // sld:Name in the Rule
						"title": "Urban fabric", // sld:Title in the Rule
						"appearance": {
							"fillColour": "#D0091D" // CssParameter with name="fill" based on the start of the name. Possible choices will be represented in the name.
						},
						"filter": {
							"attributeCsv": {
								"values": "111,112,113" // Values present in the attribute, PropertyValues as Literals inside of the Filter
							},
							"attributeInterval": {} // Ignore. Just needs to be part of the javascript model.
						}
					},
					{
						"name": "Non-urban artificial areas",
						"title": "Non-urban artificial areas",
						"appearance": {
							"fillColour": "#AE0214"
						},
						"filter": {
							"attributeCsv": {
								"values": "120,121,130,140"
							},
							"attributeInterval": {}
						}
					},
					{
						"name": "Natural and semi-natural areas",
						"title": "Natural and semi-natural areas",
						"appearance": {
							"fillColour": "#59B642"
						},
						"filter": {
							"attributeCsv": {
								"values": "310,320,330"
							},
							"attributeInterval": {}
						}
					},
					{
						"name": "Water",
						"title": "Water",
						"appearance": {
							"fillColour": "#56C8EE"
						},
						"filter": {
							"attributeCsv": {
								"values": "510,512,520"
							},
							"attributeInterval": {}
						}
					}
				]
			},
			name: 'Name',
			symbologyName: 'Symbology name',
			created: new Date(2015, 2, 2, 10, 12, 20, 10),
			createdBy: 1,
			changed: new Date(2015, 2, 2, 10, 12, 20, 10),
			changedBy: 1
		};

		supertest(app)
			.post('/rest/symbology')
			.set('Content-Type', 'application/json')
			.send(JSON.stringify(style))
			.expect(201)
			.then(function (result) {
				var objectFromApi = JSON.parse(result.body);
				createdStyle = new RestStyle(objectFromApi.uuid, objectFromApi);
				done();
			}).catch(function (error) {
			throw new Error("Error: " + error);
		});
	});

	it('should receive bad request with invalid style.', function (done) {
		supertest(app)
			.post('/rest/symbology')
			.expect(400)
			.then(function () {
				done();
			});
	});

	it('should update already existing style via the API', function (done) {
		createdStyle._definition.rules[0].name = "Test Urban";
		createdStyle.json().then(function (json) {
			supertest(app)
				.put('/rest/symbology')
				.set('Content-Type', 'application/json')
				.send(json)
				.expect(200)
				.then(function (res) {
					done();
				}).catch(function (error) {
				throw new Error("Error: " + error);
			});
		});
	});

	after(function (done) {
		// TODO: Clean the data in geoserver as well.

		schema.drop().then(function () {
			done();
		});
	});
});