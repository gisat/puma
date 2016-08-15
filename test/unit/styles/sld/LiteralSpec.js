var should = require('should');

var Literal = require('../../../../styles/sld/Literal');

describe('Literal', function(){
	var literalUnderTest = new Literal('ogc:Value');

	describe('#toXml', function(){
		var result = literalUnderTest.toXml();

		it('should represent valid literal', function(){
			should(result).equal('<ogc:Literal>ogc:Value</ogc:Literal>');
		});
	});
});