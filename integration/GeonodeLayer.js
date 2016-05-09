var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

/**
 * Represents layer in Geonode.
 */
var GeonodeLayer = function(urlOfTheServer, fileToUpload){
	this.urlOfTheServer = urlOfTheServer;
	this.fileToUpload = fileToUpload;
};

GeonodeLayer.prototype.upload = function(){
	logger.trace("GeonodeLayer#upload Upload the data to the server: ", this.urlOfTheServer, " Path to file: ",
		this.fileToUpload);

	// Log a user into the Geonode.
	return new Promise(function(resolve, reject){
		resolve();
	});
};

module.exports = GeonodeLayer;