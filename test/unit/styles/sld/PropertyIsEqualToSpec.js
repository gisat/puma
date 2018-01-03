var should = require('should');

var PropertyIsEqualTo = require('../../../../styles/sld/PropertyIsEqualTo');
var Fill = require('../../../../styles/sld/Fill');
var Literal = require('../../../../styles/sld/Literal');

describe('PropertyIsEqualTo', function () {
	var orUnderTest = new PropertyIsEqualTo([
		new Literal('Test')
	]);

	describe('#toXml', function () {
		var result = orUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<ogc:PropertyIsEqualTo><ogc:Literal>Test</ogc:Literal></ogc:PropertyIsEqualTo>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new PropertyIsEqualTo([
					new Fill([])
				]);
			}).should.throw('Trying to build invalidate. Wrong element: sld:Fill');
		});
	});
});