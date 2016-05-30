var Promise = require('promise');
var conn = require('../common/conn');
var _ = require('underscore');
var querystring = require('querystring');

var logger = require('../common/Logger').applicationWideLogger;

var Geonode = function (protocol, host, home) {
	this.home = home;

	this.referer = protocol + '://' + host + "/";
	this.defaultOptions = {
		protocol: protocol,
		host: host,
		method: 'GET'
	}
};

/**
 * @return {Promise}
 */
Geonode.prototype.loadHomePage = function () {
	logger.info("Geonode#loadHomePage Loading HomePage.");

	var self = this;
	return new Promise(function (resolve, reject) {
		var options = _.extend(self.defaultOptions, {
			path: self.home + '/',
			headers: {
				'referer': this.referer
			}
		});

		conn.request(options, null, function (err, output, homePageResponse) {
			if (err) {
				logger.error("Geonode#loadHomePage It wasn't possible to load Geonode HomePage. Error: ", err);
				reject(err);
			} else {
				resolve(homePageResponse);
			}
		});
	});
};

Geonode.prototype.login = function (username, password, csrf) {
	logger.info("Geonode#login Login to the Geonode.");

	var self = this;
	return new Promise(function (resolve, reject) {
		var formDataForLogin = querystring.stringify({
			username: username,
			password: password,
			csrfmiddlewaretoken: csrf,
			next: ''
		});
		var options = _.extend(self.defaultOptions, {
			path: self.home + '/account/login/',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': formDataForLogin.length,
				'Cookie': 'csrftoken=' + csrf,
				'referer': self.referer
			}
		});
		conn.request(options, formDataForLogin, function (err, output, loginResponse) {
			if (err) {
				logger.error("Geonode#login Error when communicating with Geonode. Error: ", err);
				reject(err);
			} else {
				resolve(loginResponse);
			}
		});
	});
};

Geonode.prototype.logout = function () {
	logger.error("Geonode#logout Not implemented yet.");
	throw new Error("Logout isn't yet implemented in the Geonode implementation.");
};

module.exports = Geonode;
