var should = require('should');

var Filter = require('../../../../styles/sld/Filter');
var Name = require('../../../../styles/sld/Name');
var And = require('../../../../styles/sld/And');

describe('Filter', function () {
	var filterUnderTest = new Filter([
		new And([])
	]);

	describe('#toXml', function () {
		var result = filterUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<ogc:Filter><ogc:And></ogc:And></ogc:Filter>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new Filter([
					new Name('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: sld:Name');
		});
	});
});