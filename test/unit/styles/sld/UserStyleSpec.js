var should = require('should');

var UserStyle = require('../../../../styles/sld/UserStyle');
var PropertyName = require('../../../../styles/sld/PropertyName');
var Name = require('../../../../styles/sld/Name');

describe('UserStyle', function () {
	var orUnderTest = new UserStyle([
		new Name('Test')
	]);

	describe('#toXml', function () {
		var result = orUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<sld:UserStyle><sld:Name>Test</sld:Name></sld:UserStyle>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new UserStyle([
					new PropertyName('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:PropertyName');
		});
	});
});