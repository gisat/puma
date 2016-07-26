var should = require('should');

var Stroke = require('../../../../styles/sld/Stroke');
var CssParameter = require('../../../../styles/sld/CssParameter');
var PropertyName = require('../../../../styles/sld/PropertyName');

describe('Stroke', function () {
	var orUnderTest = new Stroke([
		new CssParameter([])
	]);

	describe('#toXml', function () {
		var result = orUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<sld:Stroke><sld:CssParameter></sld:CssParameter></sld:Stroke>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new Stroke([
					new PropertyName('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:PropertyName');
		});
	});

	describe('#fromObjectDescription', function(){

	});
});