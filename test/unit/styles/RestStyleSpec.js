var should = require('should');

var config = require('../config');

var UUID = require('../../../common/UUID');
var RestStyle = require('../../../styles/RestStyle');

// Mechanism for storing information in the database will be created elsewhere. This mechanism will expect all object to
// contain method toPostgreSql. The constructor must also accept options object, which will contain the data structured
// as columnName: columnValue
// Dependency is to create required table in correct postgreSQL database.

describe('Style', function () {
	describe('landCover', function () {
		var landCoverUuid = new UUID().toString();
		var landCoverStyle = RestStyle.fixture(landCoverUuid);

		// Synchronous
		describe('#toSld', function () {
			var sldResult = landCoverStyle.sld();

			it('should produce valid XML', function(done){
				sldResult.then(function(sld){
					should(sld).equal('<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" version="1.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"><sld:Name>Style</sld:Name><sld:Title>Style</sld:Title><sld:NamedLayer><sld:UserStyle><sld:FeatureTypeStyle><sld:Rule><sld:Name>Urban fabric</sld:Name><sld:Title>Urban fabric</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>111</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>112</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>113</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#D0091D</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule><sld:Rule><sld:Name>Non-urban artificial areas</sld:Name><sld:Title>Non-urban artificial areas</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>120</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>121</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>130</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>140</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#AE0214</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule><sld:Rule><sld:Name>Natural and semi-natural areas</sld:Name><sld:Title>Natural and semi-natural areas</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>310</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>320</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>330</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#59B642</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule><sld:Rule><sld:Name>Water</sld:Name><sld:Title>Water</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>510</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>512</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>520</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#56C8EE</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule></sld:FeatureTypeStyle></sld:UserStyle></sld:NamedLayer></sld:StyledLayerDescriptor>');
					done();
				});
			});
		});

		describe('#validateDescriptionCreation', function(){
			it('must contain type', function(){
				var result = RestStyle.validateDescriptionCreation({
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
						}
					]
				});

				should(result).be.exactly(false);
			});
		});

		describe('#validateDescriptionUpdate', function(){
			it('must contain type', function(){
				var result = RestStyle.validateDescriptionUpdate({
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
						}
					]
				});

				should(result).be.exactly(false);
			});

			it('must contain filterType', function(){
				var result = RestStyle.validateDescriptionUpdate({
					"type": "polygon", // PolygonSymbolizer
					"filterAttributeKey": 5, // Filter id of attributeset
					"filterAttributeSetKey": 2, // Id of attributeset which contains attributes for rules.
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
						}
					]
				});

				should(result).be.exactly(false);
			});

			it('must contain filter attribute key', function(){
				var result = RestStyle.validateDescriptionUpdate({
					"type": "polygon", // PolygonSymbolizer
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
						}
					]
				});

				should(result).be.exactly(false);
			});

			it('must contain filter attribute set key', function(){
				var result = RestStyle.validateDescriptionUpdate({
					"type": "polygon", // PolygonSymbolizer
					"filterAttributeKey": 5, // Filter id of attributeset
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
						}
					]
				});

				should(result).be.exactly(false);
			});

			it('must contain rules', function(){
				var result = RestStyle.validateDescriptionUpdate({
					"type": "polygon", // PolygonSymbolizer
					"filterAttributeKey": 5, // Filter id of attributeset
					"filterAttributeSetKey": 2, // Id of attributeset which contains attributes for rules.
					"filterType": "attributeCsv", // Comma separated values
					"rules": []
				});

				should(result).be.exactly(false);
			});

			it('must contain valid rules with title', function(){
				var result = RestStyle.validateDescriptionUpdate({
					"type": "polygon", // PolygonSymbolizer
					"filterAttributeKey": 5, // Filter id of attributeset
					"filterAttributeSetKey": 2, // Id of attributeset which contains attributes for rules.
					"filterType": "attributeCsv", // Comma separated values
					"rules": [
						{
							"name": "Urban fabric",
							"appearance": {
								"fillColour": "#D0091D"
							},
							"filter": {
								"attributeCsv": {
									"values": "111,112,113" // Values present in the attribute
								},
								"attributeInterval": {}
							}
						}
					]
				});

				should(result).be.exactly(false);
			});

			it('must contain valid rules with title', function(){
				var result = RestStyle.validateDescriptionUpdate({
					"type": "polygon", // PolygonSymbolizer
					"filterAttributeKey": 5, // Filter id of attributeset
					"filterAttributeSetKey": 2, // Id of attributeset which contains attributes for rules.
					"filterType": "attributeCsv", // Comma separated values
					"rules": [
						{
							"name": "Urban fabric",
							"title": "Urban fabric",
							"filter": {
								"attributeCsv": {
									"values": "111,112,113" // Values present in the attribute
								},
								"attributeInterval": {}
							}
						}
					]
				});

				should(result).be.exactly(false);
			});
		});
	});
});