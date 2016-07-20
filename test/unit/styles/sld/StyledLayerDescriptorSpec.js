var should = require('should');

var StyledLayerDescriptor = require('../../../../styles/sld/StyledLayerDescriptor');
var PropertyIsEqualTo = require('../../../../styles/sld/PropertyIsEqualTo');
var PropertyName = require('../../../../styles/sld/PropertyName');
var Literal = require('../../../../styles/sld/Literal');

describe('StyledLayerDescriptor', function(){
	var simpleDocument = new StyledLayerDescriptor([
		new PropertyIsEqualTo([
			new PropertyName('gid'),
			new Literal('456')
		])
	]);

	describe('#toXml', function(){
		var result = simpleDocument.toXml();

		it('should represent valid sld document', function(){
			should(result).equal('<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" version="1.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"><ogc:PropertyIsEqualTo><ogc:PropertyName>gid</ogc:PropertyName><ogc:Literal>456</ogc:Literal></ogc:PropertyIsEqualTo></sld:StyledLayerDescriptor>');
		});
	});
});