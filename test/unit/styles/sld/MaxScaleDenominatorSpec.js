var should = require('should');

var MaxScaleDenominator = require('../../../../styles/sld/MaxScaleDenominator');

describe('MaxScaleDenominator', function(){
	var maxScaleDenominatorUnderTest = new MaxScaleDenominator('ogc:Value');

	describe('#toXml', function(){
		var result = maxScaleDenominatorUnderTest.toXml();

		it('should represent valid literal', function(){
			should(result).equal('<sld:MaxScaleDenominator>ogc:Value</sld:MaxScaleDenominator>');
		});
	});
});