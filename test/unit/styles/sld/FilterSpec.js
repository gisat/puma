var should = require('should');

var Filter = require('../../../../styles/sld/Filter');
var Name = require('../../../../styles/sld/Name');
var And = require('../../../../styles/sld/And');

describe('Filter', function () {
	var filterUnderTest = new Filter([
		new And([])
	]);

	describe('#toXml', function () {
		var result = filterUnderTest.toXml();

		it('should return valid Xml', function () {
			should(result).equal('<ogc:Filter><ogc:And></ogc:And></ogc:Filter>');
		});
	});

	describe('#invalidChildren', function () {
		it('should fail with exception', function () {
			(function () {
				new Filter([
					new Name('Test')
				]);
			}).should.throw('Trying to build invalidate. Wrong element: sld:Name');
		});
	});

	describe('#fromDescription', function(){
		var filterResult = Filter.fromDescription({
			"attributeCsv": {
				"values": "111,112,113"
			}
		}, "1", "attributeCsv");
		var xmlResult = filterResult.toXml();

		it('should return valid Xml', function(){
			should(xmlResult).equal('<ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>1</ogc:PropertyName><ogc:Literal>111</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>1</ogc:PropertyName><ogc:Literal>112</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>1</ogc:PropertyName><ogc:Literal>113</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter>');
		});
	});
});