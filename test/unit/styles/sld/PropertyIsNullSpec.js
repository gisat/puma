var should = require('should');

var PropertyIsNull = require('../../../../styles/sld/PropertyIsNull');
var Fill = require('../../../../styles/sld/Fill');
var PropertyName = require('../../../../styles/sld/PropertyName');

describe('PropertyIsNull', function () {
	var orUnderTest = new PropertyIsNull([
		new PropertyName('Test')
	]);

	describe('#toXml', function () {
		var result = orUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<ogc:PropertyIsNull><ogc:PropertyName>Test</ogc:PropertyName></ogc:PropertyIsNull>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new PropertyIsNull([
					new Fill([])
				]);
			}).should.throw('Trying to build invalidate. Wrong element: sld:Fill');
		});
	});
});