var config = require('../config');
var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;

var Geonode = require('./Geonode');
var Cookies = require('../common/Cookies');

var User = function(username, password){
	this.username = username;
	this.password = password;

	this.logged = false;
	this.ssid = null;
	this.csrf = null;

	this.geonode = new Geonode(config.geonodeProtocol, config.geonodeHost, config.geonodeProtocol);
};

User.prototype.login = function(){
	logger.info("User#login Username: ", this.username, " Password: ", this.password);

	var self = this;
	this.geonode.loadHomePage().then(function(homePageResponse){
		var cookies = new Cookies(homePageResponse);
		if(!cookies.atLeastOne()) {
			logger.error("User#login Cookies weren't set for the request to the HomePage");
			throw new Error("User#login Cookies weren't set for the request to the HomePage");
		}

		if(cookies.get("csrf") == null) {
			logger.error("User#login Csrf wasn't present in response");
			throw new Error("User#login Csrf wasn't present in response");
		}

		return self.geonode.login(self.username, self.password, csrf);
	}).then(function(loginResponse){
		// TODO validate meaningfully response.
		var cookies = new Cookies(loginResponse);
		self.logged = true;
		self.ssid = cookies.get("ssid");
		if(!self.ssid) {
			logger.error("User#login The response doesn't contain the ssid. Probably invalid login " +
				"information.");
		}
		self.csrf = cookies.get("csrf");
		if(!self.csrf) {
			logger.error("User#login The response doesn't contain the csrf");
		}
	}).catch(function(err){
		logger.error("User#login It wasn't possible to log user into the solution. Error: ", err);
	});
};

module.exports = User;