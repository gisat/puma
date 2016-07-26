var should = require('should');

var Fill = require('../../../../styles/sld/Fill');
var CssParameter = require('../../../../styles/sld/CssParameter');
var Name = require('../../../../styles/sld/Name');
var Title = require('../../../../styles/sld/Title');
var And = require('../../../../styles/sld/And');

describe('Fill', function () {
	var fillUnderTest = new Fill([
		new CssParameter([])
	]);

	describe('#toXml', function () {
		var result = fillUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<sld:Fill><sld:CssParameter></sld:CssParameter></sld:Fill>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new Fill([
					new And([])
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:And');
		});
	});

	describe('#fromDescription', function(){
		var fillResult = Fill.fromDescription({fillColour: '#ff0000'});
		var xmlResult = fillResult.toXml();

		it('should return valid Xml', function(){
			should(xmlResult).equal('<sld:Fill><sld:CssParameter name="fill">#ff0000</sld:CssParameter></sld:Fill>');
		});
	});
});