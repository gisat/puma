var should = require('should');

var CssParameter = require('../../../../styles/sld/CssParameter');
var Literal = require('../../../../styles/sld/Literal');
var Attribute = require('../../../../styles/sld/common/Attribute');
var And = require('../../../../styles/sld/And');

describe('CssParameter', function () {
	var cssParameterUnderTest = new CssParameter([
		new Literal('TestValue')
	], [
		new Attribute('name','stroke')
	]);

	describe('#toXml', function () {
		var result = cssParameterUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<sld:CssParameter name="stroke"><ogc:Literal>TestValue</ogc:Literal></sld:CssParameter>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new CssParameter([
					new And([])
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:And');
		});
	});
});