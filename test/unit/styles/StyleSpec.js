var should = require('should');
var Style = require('../../../styles/Style');
var UUID = require('../../../common/UUID');

// Dependency is to create required table in correct postgreSQL database.
describe('Style', function () {
	describe('landCover', function () {
		var landCoverUuid = new UUID().toString();
		var definitionOfStyle = {
			"type": "polygon",
			"filterAttributeKey": 5,
			"filterAttributeSetKey": 2,
			"filterType": "attributeCsv",
			"rules": [
				{
					"name": "Urban fabric",
					"title": "Urban fabric",
					"appearance": {
						"fillColour": "#D0091D"
					},
					"filter": {
						"attributeCsv": {
							"values": "111,112,113"
						},
						"attributeInterval": {}
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
		};
		var landCoverStyle = new Style(landCoverUuid, definitionOfStyle);

		// Synchronous
		describe('toSld', function () {

		});

		// Asynchronous
		describe('toPostgreSql', function () {

		});
	});
});