var should = require('should');

var connection = require('../../../common/conn');
var config = require('../config');

var UUID = require('../../../common/UUID');
var Style = require('../../../styles/Style');

// Mechanism for storing information in the database will be created elsewhere. This mechanism will expect all object to
// contain method toPostgreSql. The constructor must also accept options object, which will contain the data structured
// as columnName: columnValue
// Dependency is to create required table in correct postgreSQL database.

describe('Style', function () {
	describe('landCover', function () {
		var landCoverUuid = new UUID().toString();
		var definitionOfStyle = {
			"type": "polygon", // PolygonSymbolizer
			"filterAttributeKey": 5, // Filter id of attributeset
			"filterAttributeSetKey": 2, // Id of attributeset which contains attributes for rules.
			"filterType": "attributeCsv", // Comma separated values
			"rules": [
				{
					"name": "Urban fabric",
					"title": "Urban fabric",
					"appearance": {
						"fillColour": "#D0091D"
					},
					"filter": {
						"attributeCsv": {
							"values": "111,112,113" // Values present in the attribute
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
		describe('#toSld', function () {
			var sldResult = landCoverStyle.toSld();

			should(sldResult).equal("");
		});

		// Synchronous
		describe('#toSql', function () {
			var sql = landCoverStyle.toPostgreSql(connection);

			should(sql).equal("insert into panther_style ('mongoStyleId', 'sldBody') values (1, '')");
		});

		describe('#validateDescription', function(){
			it('#mustContainType', function(){
				var result = Style.validateDescription({});

				should(result).be.exactly(false);
			});
		});
	});
});