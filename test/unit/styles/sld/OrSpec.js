var should = require('should');

var Or = require('../../../../styles/sld/Or');
var And = require('../../../../styles/sld/And');
var Literal = require('../../../../styles/sld/Literal');

describe('Or', function () {
	var orUnderTest = new Or([
		new And([])
	]);

	describe('#toXml', function () {
		var result = orUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<ogc:Or><ogc:And></ogc:And></ogc:Or>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new Or([
					new Literal('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:Literal');
		});
	});
});