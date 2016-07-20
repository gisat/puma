var should = require('should');

var Intersection = require('../../../../../styles/sld/common/Intersection');
var Leaf = require('../../../../../styles/sld/common/Leaf');

describe('Intersection', function(){
	var propertyIsEqualTo = new Intersection("ogc:PropertyIsEqualTo", [
		new Leaf("ogc:PropertyName", "gid"),
		new Leaf("ogc:Literal", 456)
	]);

	describe('#toXml', function(){
		var result = propertyIsEqualTo.toXml();

		it('should prepare correct xml element.', function(){
			should(result).equal('<ogc:PropertyIsEqualTo><ogc:PropertyName>gid</ogc:PropertyName><ogc:Literal>456</ogc:Literal></ogc:PropertyIsEqualTo>');
		});
	});
});