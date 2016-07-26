var should = require('should');

var CssParameter = require('../../../../styles/sld/CssParameter');
var Literal = require('../../../../styles/sld/Literal');
var Attribute = require('../../../../styles/sld/common/Attribute');
var And = require('../../../../styles/sld/And');

describe('CssParameter', function () {
	var cssParameterUnderTest = new CssParameter('#ff0000', [
		new Attribute('name','stroke')
	]);

	describe('#toXml', function () {
		var result = cssParameterUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<sld:CssParameter name="stroke">#ff0000</sld:CssParameter>');
		});
	});

	describe('#fromDescription', function(){
		var result = CssParameter.fromDescription({fillColour: '#ff0000'});

		var xmlResult = result.toXml();

		it('should return valid Xml', function(){
			should(xmlResult).equal('<sld:CssParameter name="fill">#ff0000</sld:CssParameter>');
		});
	});
});