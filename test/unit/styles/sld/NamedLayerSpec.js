var should = require('should');

var NamedLayer = require('../../../../styles/sld/NamedLayer');
var Name = require('../../../../styles/sld/Name');
var Literal = require('../../../../styles/sld/Literal');

describe('NamedLayer', function () {
	var filterUnderTest = new NamedLayer([
		new Name('Test')
	]);

	describe('#toXml', function () {
		var result = filterUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<sld:NamedLayer><sld:Name>Test</sld:Name></sld:NamedLayer>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new NamedLayer([
					new Literal('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:Literal');
		});
	});
});