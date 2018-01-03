var should = require('should');

var Function = require('../../../../styles/sld/Function');
var Name = require('../../../../styles/sld/Name');
var And = require('../../../../styles/sld/And');
var Literal = require('../../../../styles/sld/Literal');

describe('Function', function () {
	var filterUnderTest = new Function([
		new Literal('Test')
	]);

	describe('#toXml', function () {
		var result = filterUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<ogc:Function><ogc:Literal>Test</ogc:Literal></ogc:Function>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new Function([
					new Name('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: sld:Name');
		});
	});
});