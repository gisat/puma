var should = require('should');

var Not = require('../../../../styles/sld/Not');
var And = require('../../../../styles/sld/And');
var Literal = require('../../../../styles/sld/Literal');

describe('Not', function () {
	var notUnderTest = new Not([
		new And([])
	]);

	describe('#toXml', function () {
		var result = notUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<ogc:Not><ogc:And></ogc:And></ogc:Not>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new Not([
					new Literal('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:Literal');
		});
	});
});