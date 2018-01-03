var should = require('should');

var Rule = require('../../../../styles/sld/Rule');
var Filter = require('../../../../styles/sld/Filter');
var PropertyName = require('../../../../styles/sld/PropertyName');

describe('Rule', function () {
	var orUnderTest = new Rule([
		new Filter([])
	]);

	describe('#toXml', function () {
		var result = orUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<sld:Rule><ogc:Filter></ogc:Filter></sld:Rule>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new Rule([
					new PropertyName('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:PropertyName');
		});
	});

	describe('#fromObjectDescription', function () {
		var resultRule = Rule.fromObjectDescription({
			"name": "Urban fabric", // sld:Name in the Rule
			"title": "Urban fabric", // sld:Title in the Rule
			"appearance": {
				"fillColour": "#ff0000" // CssParameter with name="fill" based on the start of the name. Possible choices will be represented in the name.
			},
			"filter": {
				"attributeCsv": {
					"values": "111,112,113" // Values present in the attribute, PropertyValues as Literals inside of the Filter
				},
				"attributeInterval": {} // Ignore. Just needs to be part of the javascript model.
			}
		}, "polygon", 1, 2, "attributeCsv");
		var xmlResult = resultRule.toXml();

		it('should return valid Xml', function () {
			should(xmlResult).equal('<sld:Rule><sld:Name>Urban fabric</sld:Name><sld:Title>Urban fabric</sld:Title><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#ff0000</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>Urban fabric</ogc:PropertyName><ogc:Literal>111</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>Urban fabric</ogc:PropertyName><ogc:Literal>112</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>Urban fabric</ogc:PropertyName><ogc:Literal>113</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter></sld:Rule>');
		});
	});
});