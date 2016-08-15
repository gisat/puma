var should = require('should');

var PropertyName = require('../../../../styles/sld/PropertyName');

describe('PropertyName', function(){
	var propertyNameUnderTest = new PropertyName('ogc:Value');

	describe('#toXml', function(){
		var result = propertyNameUnderTest.toXml();

		it('should represent valid literal', function(){
			should(result).equal('<ogc:PropertyName>ogc:Value</ogc:PropertyName>');
		});
	});
});