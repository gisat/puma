var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

var RasterToVector = function(rasterFileLocation) {

};

/**
 * @returns {Promise} promise.
 */
RasterToVector.prototype.process = function(){
	return new Promise(function(resolve, reject){
		resolve();
	});
};

module.exports = RasterToVector;