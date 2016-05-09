var querystring = require('querystring');
var config = require('../config');
var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;

var Geonode = require('./Geonode');

var User = function(username, password){
	this.username = username;
	this.password = password;
	this.ssid = null;
	this.isLogged = false;
	
	this.geonode = new Geonode(config.geonodeProtocol, config.geonodeHost, config.geonodeProtocol);
};

User.prototype.login = function(){
	logger.info("User#login Username: ", this.username, " Password: ", this.password);

	var self = this;
	conn.request(loadHomePage,null,function(err,output,homePageResponse) {
		if (err) {
			logger.error("User#login It wasn't possible to load Geonode HomePage. Error: ", err);
			return;
		}
		if(!('set-cookie' in homePageResponse.headers)) {
			logger.error("User#login Cookies weren't set for the request to the HomePage");
			return;
		}

		var cookies = [];
		homePageResponse.headers['set-cookie'][0].split(';').forEach(function(element, index, array){
			var pair = element.split("=");
			var key = decodeURIComponent(pair.shift()).trim();
			var value = decodeURIComponent(pair.join("=")).trim();
			cookies[key] = value;
		});
		var csrf = cookies['csrftoken'];
		var formDataForLogin = querystring.stringify({
			username: self.username,
			password: self.password,
			csrfmiddlewaretoken: csrf,
			next: ''
		});
		var options2 = {
			protocol: config.geonodeProtocol,
			host: config.geonodeHost,
			path: isLogin ? config.geonodePath+'/account/login/' : config.geonodePath+'/account/logout/',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postData.length,
				'Cookie':'csrftoken='+csrf,
				'referer': config.remoteProtocol + '://' + config.geonodeHost + '/'
			}
		};
		conn.request(options2,postData,function(err,output,res2) {
			if (err){
				console.log("\n\nconn.geonodeCom ERROR:\nerr code:", err, "\noutput:", output);
				return generalCallback(err);
			}
			return specificCallback(res2);
		});
	});
};

module.exports = User;