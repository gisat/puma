var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;
var config = require('../config');

var User = require('./User');
var Geonode = require('./Geonode');

/**
 * Represents layer in Geonode.
 */
var GeonodeLayer = function(fileToUpload){
	this.fileToUpload = fileToUpload;

	this.geonode = new Geonode(config.geonodeProtocol, config.geonodeHost, config.geonodeProtocol);
};

GeonodeLayer.prototype.upload = function(){
	logger.info("GeonodeLayer#upload Upload the data to the server: ", this.urlOfTheServer, " Path to file: ",
		this.fileToUpload);

	// Log a user into the Geonode.
	// Upload this layer using the logged in user.
	var self = this;
	return new Promise(function(resolve, reject){
		var user = new User(self.geonode, config.urbanTepGeonodeUserName, config.urbanTepGeonodeUserPassword);
		user.login().then(function(){
			return self.geonode.uploadLayer(self.fileToUpload);
		}).then(function(){
			resolve();
		}).catch();
		resolve();
	});
};

module.exports = GeonodeLayer;