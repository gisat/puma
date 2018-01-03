var should = require('should');

var And = require('../../../../styles/sld/And');
var PropertyIsEqualTo = require('../../../../styles/sld/PropertyIsEqualTo');
var Name = require('../../../../styles/sld/Name');

describe('And', function(){
	var andUnderTest = new And([
		new PropertyIsEqualTo([]),
		new And([])
	]);

	describe('#toXml', function(){
		var result = andUnderTest.toXml();

		it('should return valid Xml', function(){
			should(result).equal('<ogc:And><ogc:PropertyIsEqualTo></ogc:PropertyIsEqualTo><ogc:And></ogc:And></ogc:And>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new And([
					new Name('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: sld:Name');
		});
	});
});