var should = require('should');

var PropertyIsNotEqualTo = require('../../../../styles/sld/PropertyIsNotEqualTo');
var Fill = require('../../../../styles/sld/Fill');
var Literal = require('../../../../styles/sld/Literal');

describe('PropertyIsNotEqualTo', function () {
	var orUnderTest = new PropertyIsNotEqualTo([
		new Literal('Test')
	]);

	describe('#toXml', function () {
		var result = orUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<ogc:PropertyIsNotEqualTo><ogc:Literal>Test</ogc:Literal></ogc:PropertyIsNotEqualTo>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new PropertyIsNotEqualTo([
					new Fill([])
				]);
			}).should.throw('Trying to build invalidate. Wrong element: sld:Fill');
		});
	});
});