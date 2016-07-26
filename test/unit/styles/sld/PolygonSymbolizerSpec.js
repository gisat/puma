var should = require('should');

var PolygonSymbolizer = require('../../../../styles/sld/PolygonSymbolizer');
var Fill = require('../../../../styles/sld/Fill');
var Literal = require('../../../../styles/sld/Literal');

describe('PolygonSymbolizer', function () {
	var orUnderTest = new PolygonSymbolizer([
		new Fill([])
	]);

	describe('#toXml', function () {
		var result = orUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<sld:PolygonSymbolizer><sld:Fill></sld:Fill></sld:PolygonSymbolizer>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new PolygonSymbolizer([
					new Literal('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:Literal');
		});
	});
});