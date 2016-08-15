var should = require('should');

var FeatureTypeStyle = require('../../../../styles/sld/FeatureTypeStyle');
var Name = require('../../../../styles/sld/Name');
var Title = require('../../../../styles/sld/Title');
var And = require('../../../../styles/sld/And');

describe('FeatureTypeStyle', function () {
	var andUnderTest = new FeatureTypeStyle([
		new Name('Value'),
		new Title('Title Value')
	]);

	describe('#toXml', function () {
		var result = andUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<sld:FeatureTypeStyle><sld:Name>Value</sld:Name><sld:Title>Title Value</sld:Title></sld:FeatureTypeStyle>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new FeatureTypeStyle([
					new And([])
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:And');
		});
	});
});