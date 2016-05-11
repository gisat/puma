var Promise = require('promise');
var cp = require('child_process');
var path = require('path');

var logger = require('../common/Logger').applicationWideLogger;

var RasterToVector = function(scriptsDirectoryLocation, rasterFileLocation, vectorFileLocation) {
	this.scriptLocation = scriptsDirectoryLocation + "vectorize-guf.sh";
	this.rasterFileLocation = rasterFileLocation;
	this.vectorFileLocation = vectorFileLocation;
};

/**
 * @returns {Promise} promise.
 */
RasterToVector.prototype.process = function(){
	logger.trace('RasterToVector#process Start processing of the raster. Location: ', this.rasterFileLocation, ' -> ',
		this.vectorFileLocation, " Script: ", this.scriptLocation);

	var self = this;
	return new Promise(function(resolve, reject){
		if (path.existsSync(self.vectorFileLocation)) {
			// todo do we reject or overwrite existing file?
			logger.info("RasterToVector#process Aborted processing. Vector file", self.vectorFileLocation, "already exists.");
			reject("Aborted processing. Vector file", self.vectorFileLocation, "already exists.");
		}

		cp.execFile(self.scriptLocation, [self.rasterFileLocation, self.vectorFileLocation], {}, function(err, stdout, stderr) {
			if(err) {
				logger.error("RasterToVector#process Error processing the vector file. err:", err);
				reject(err);
			}
			if(stderr) {
				logger.error("RasterToVector#process Error processing the vector file. stderr:\n", stderr);
				reject(new Error("Error in stderr of", self.scriptLocation));
			}

			console.log(stdout);
			resolve();
		});
	});
};

module.exports = RasterToVector;