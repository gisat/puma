var should = require('should');

var Title = require('../../../../styles/sld/Title');

describe('Title', function(){
	var titleUnderTest = new Title('Value');

	describe('#toXml', function(){
		var result = titleUnderTest.toXml();

		it('should represent valid Title', function(){
			should(result).equal('<sld:Title>Value</sld:Title>');
		});
	});
});