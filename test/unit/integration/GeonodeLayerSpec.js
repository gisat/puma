var should = require('should');

var GeonodeLayer = require('../../../integration/GeonodeLayer');

describe('GeonodeLayer', function(){
	describe('#upload', function(){
		it('Uploads layer to Geonode', function(){
			new GeonodeLayer().upload();
			
			//should(response).be("Success");
		});
	});
});