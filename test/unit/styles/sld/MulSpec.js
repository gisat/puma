var should = require('should');

var Mul = require('../../../../styles/sld/Mul');
var Name = require('../../../../styles/sld/Name');
var Literal = require('../../../../styles/sld/Literal');

describe('Mul', function () {
	var filterUnderTest = new Mul([
		new Literal('Test')
	]);

	describe('#toXml', function () {
		var result = filterUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<ogc:Mul><ogc:Literal>Test</ogc:Literal></ogc:Mul>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new Mul([
					new Name('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: sld:Name');
		});
	});
});