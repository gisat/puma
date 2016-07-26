var should = require('should');

var StyledLayerDescriptor = require('../../../../styles/sld/StyledLayerDescriptor');
var PropertyIsEqualTo = require('../../../../styles/sld/PropertyIsEqualTo');
var PropertyName = require('../../../../styles/sld/PropertyName');
var Literal = require('../../../../styles/sld/Literal');

describe('StyledLayerDescriptor', function(){
	var simpleDocument = new StyledLayerDescriptor([
		new PropertyIsEqualTo([
			new PropertyName('gid'),
			new Literal('456')
		])
	]);

	var definitionOfStyle = {
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
	};

	describe('#toXml', function(){
		var result = simpleDocument.toXml();

		it('should represent valid sld document', function(){
			should(result).equal('<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" version="1.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"><ogc:PropertyIsEqualTo><ogc:PropertyName>gid</ogc:PropertyName><ogc:Literal>456</ogc:Literal></ogc:PropertyIsEqualTo></sld:StyledLayerDescriptor>');
		});
	});

	describe('#fromObjectDescription', function(){
		var document = StyledLayerDescriptor.fromObjectDescription(definitionOfStyle);

		var expectedXml = document.toXml();
		it('should represent valid generated Xml', function(){
			should(expectedXml).equal('<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" version="1.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"><sld:Name>Style</sld:Name><sld:Title>Style</sld:Title><sld:NamedLayer><sld:UserStyle><sld:FeatureTypeStyle><sld:Rule><sld:Name>Urban fabric</sld:Name><sld:Title>Urban fabric</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>111</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>112</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>113</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#D0091D</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule><sld:Rule><sld:Name>Non-urban artificial areas</sld:Name><sld:Title>Non-urban artificial areas</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>120</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>121</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>130</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>140</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#AE0214</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule><sld:Rule><sld:Name>Natural and semi-natural areas</sld:Name><sld:Title>Natural and semi-natural areas</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>310</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>320</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>330</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#59B642</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule><sld:Rule><sld:Name>Water</sld:Name><sld:Title>Water</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>510</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>512</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>520</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#56C8EE</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule></sld:FeatureTypeStyle></sld:UserStyle></sld:NamedLayer></sld:StyledLayerDescriptor>');
		});
	});
});