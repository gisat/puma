var Promise = require('promise');
var cp = require('child_process');
var logger = require('../common/Logger').applicationWideLogger;

var RasterToVector = function(scriptsDirectoryLocation, rasterFileLocation) {
	this.scriptLocation = scriptsDirectoryLocation + "vectorize-guf.sh";
	this.rasterFileLocation = rasterFileLocation;
};

/**
 * @returns {Promise} promise.
 */
RasterToVector.prototype.process = function(){
	logger.trace('RasterToVector#process Start processing of the raster. Location: ', this.rasterFileLocation,
		" Script: ", this.scriptsDirectoryLocation);

	var self = this;
	return new Promise(function(resolve, reject){
		cp.execFile(self.scriptLocation, [], {}, function(err, stdout, stderr) {
			if(err) {
				logger.error("RasterToVector#process Error processing the vector file.", err);
				reject(err);
			}

			console.log(stdout);
			resolve();
		});
	});
};

module.exports = RasterToVector;