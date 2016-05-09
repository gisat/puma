var Promise = require('promise');
var conn = require('../common/conn');

var logger = require('../common/Logger').applicationWideLogger;

var Geonode = function(protocol, host, home){
	this.protocol = protocol;
	this.host = host;
	this.home = home;
};

/**
 * @return {Promise}
 */
Geonode.prototype.loadHomePage = function() {
	logger.info("Geonode#loadHomePage Loading HomePage.");

	var self = this;
	return new Promise(function(resolve, reject) {
		var loadHomePage = {
			protocol: self.protocol,
			host: self.host,
			path: self.home+'/',
			method: 'GET',
			headers: {
				'referer': self.protocol + '://' + self.host + "/"
			}
		};

		conn.request(loadHomePage,null,function(err,output,homePageResponse) {
			if (err) {
				logger.error("Geonode#loadHomePage It wasn't possible to load Geonode HomePage. Error: ", err);
				reject(err);
			}
			resolve(homePageResponse);
		});
	});
};

Geonode.prototype.login = function() {
	
};

module.exports = Geonode;
