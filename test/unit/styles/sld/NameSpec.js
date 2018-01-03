var should = require('should');

var Name = require('../../../../styles/sld/Name');

describe('Name', function(){
	var nameUnderTest = new Name('Value');

	describe('#toXml', function(){
		var result = nameUnderTest.toXml();

		it('should represent valid Name', function(){
			should(result).equal('<sld:Name>Value</sld:Name>');
		});
	});
});