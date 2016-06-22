var should = require('should');

var Leaf = require('../../../../../styles/sld/common/Leaf');

describe('Leaf', function(){
	var name = new Leaf("sld:Name", "TestName");

	describe('#toXml', function(){
		var result = name.toXml();

		it('will be valid xml element.', function(){
			should(result).equal('<sld:Name>TestName</sld:Name>');
		})
	});
});