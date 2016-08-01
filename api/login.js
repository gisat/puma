var querystring = require('querystring');
var http = require('http');
var conn = require('../common/conn');
var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

function getLoginInfo(params,req,res,callback) {
	var data = {
		userId: req.userId,
		groups: req.groups,
		userName: req.userName
	};
	res.data = req.userId ? data : null;
	callback();
}

function login(params,req,res,callback) {
	geonodeCom(params,true,callback,function(res1) {
		var cookies = res1.headers['set-cookie'] || [];
		logger.info("login# login(), Login headers received: ", res1.headers, "\n Cookies: ", cookies);
		var ssid = null;
		var csrfToken = null;
		for (var i=0; i<cookies.length; i++) {
			var cookieRow = cookies[i].split(';')[0];
			var name = cookieRow.split('=')[0];
			if (name == 'sessionid') {
				ssid = cookieRow.split('=')[1];
			}
			if(name == 'csrftoken') {
				csrfToken = cookieRow.split('=')[1];
			}
		}
		if (!ssid) {
			// Update to return 400 instead of 500
			return callback(new Error(logger.info("login# login(), Invalid login")));
		}
		res.cookie('ssid',ssid,{httpOnly: true});
		res.cookie('sessionid',ssid,{httpOnly: true});
		res.cookie('csrftoken',csrfToken,{httpOnly: true});

		res.data = {status: 'ok', ssid: ssid, csrfToken: csrfToken};
		callback();
	})

}

function logout(params,req,res,callback) {
	geonodeCom(params,false,callback,function() {
		res.clearCookie('ssid');
		callback();
	})
}


var geonodeCom = function(params,isLogin,generalCallback,specificCallback) {

	var options1 = {
		protocol: config.geonodeProtocol,
		host: config.geonodeHost,
		port: config.geonodePort || 80,
		path: config.geonodeHome + '/layers',
		method: 'GET',
		headers: {
			'referer': config.geonodeProtocol + '://' + config.geonodeHost + (config.geonodePort==80 ? "" : ":" + config.geonodePort) + "/"
		}
	};

	conn.request(options1,null,function(err,output,res1) {
		if (err) {
			logger.error("api/login.js geonodeCom. Options: ", options1, " Error: ", err);
			return generalCallback(err);
		}
		var qsVars = [];
		if(!('set-cookie' in res1.headers)) return generalCallback({message: 'cookies not set'});
		res1.headers['set-cookie'][0].split(';').forEach(function(element, index, array){
			var pair = element.split("=");
			var key = decodeURIComponent(pair.shift()).trim();
			var value = decodeURIComponent(pair.join("=")).trim();
			qsVars[key] = value;
		});
		var csrf = qsVars['csrftoken'];
		var postData = {
			username: params.username,
			password: params.password,
			csrfmiddlewaretoken: csrf,
			next: ''
		};
		if(isLogin){
			postData['username'] = params.username;
			postData['password'] = params.password;
		}
		postData = querystring.stringify(postData);
		var options2 = {
			protocol: config.geonodeProtocol,
			host: config.geonodeHost,
			port: config.geonodePort || 80,
			path: isLogin ? config.geonodePath + '/account/login/' : config.geonodePath + '/account/logout/',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postData.length,
				'Cookie':'csrftoken='+csrf,
				'referer': config.remoteProtocol + '://' + config.geonodeHost + (config.geonodePort==80 ? "" : ":" + config.geonodePort) + '/'
			}
		};
		conn.request(options2,postData,function(err,output,res2) {
			if (err){
				logger.error("api/login.js geonodeCom ERROR:", err, " Output:", output, " Options: ", options2);
				return generalCallback(err);
			}
			return specificCallback(res2);
		});
	});

};

module.exports = {
	login: login,
	logout: logout,
	getLoginInfo: getLoginInfo
};
