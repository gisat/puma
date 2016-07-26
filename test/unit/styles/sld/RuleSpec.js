var should = require('should');

var Rule = require('../../../../styles/sld/Rule');
var Filter = require('../../../../styles/sld/Filter');
var PropertyName = require('../../../../styles/sld/PropertyName');

describe('Rule', function () {
	var orUnderTest = new Rule([
		new Filter([])
	]);

	describe('#toXml', function () {
		var result = orUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<sld:Rule><ogc:Filter></ogc:Filter></sld:Rule>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new Rule([
					new PropertyName('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: ogc:PropertyName');
		});
	});

	describe('#fromObjectDescription', function(){

	});
});