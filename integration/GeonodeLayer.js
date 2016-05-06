var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

/**
 * Created by jbalhar on 6. 5. 2016.
 */
var GeonodeLayer = function(){

};

GeonodeLayer.prototype.upload = function(){
	return new Promise(function(resolve, reject){
		resolve();
	});
};

module.exports = GeonodeLayer;