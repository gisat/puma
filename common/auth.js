var http = require('http');
var conn = require('./conn');
var pg = require('pg');
var sessionCache = {};
var config = require('../config');
var logger = require('./Logger').applicationWideLogger;

function anyUser(req, res, next) {
	if (req.userId) {
		return next();
	}

	logger.error("Anonymous user isn't authorized for request. Method: ", req.method," Url:", req.url);
	return next(new Error('unauthorized'))
}

function adminOrOwner(req, res, next) {
	if (req.groups && req.groups.indexOf('admingroup') != -1) {
		return next();
	}

	logger.error("User isn't authorized for request. Method: ", req.method," Url:", req.url);
	return next(new Error('unauthorized'));
}

function anyone(req, res, next){
	return next();
}

function owner(req,res,next) {

}


function auth(req, res, next) {
	// So the user will logIn after that there should be sessionId and we will have information about whether the user
	// logged succesfully
	var sessionId = req.sessionID || req.cookies.ssid || req.ssid;
	if (!sessionId){
		return next();
	}
	req.ssid = sessionId;
	var userName = sessionCache[sessionId];
	if (userName) {
		return fetchUserInfo(userName, req, sessionId, next);
	}

	var headers = {
		'Cookie': 'sessionid=' + sessionId
	};

	// It is possible to retrieve this information from the database and actually use it for other stuff as well. 
	var options = {
		protocol: config.geonodeProtocol,
		host: config.geonodeHost,
		path: config.geonodePath+'/layers/acls',
		headers: headers,
		method: 'GET'
	};
	conn.request(options, null, function(err, output) {
		if (err){
			return next(err);
		}
		try{
			var obj = JSON.parse(output);
		}catch(e){
			if(typeof obj !== 'object'){
				throw "Failed to parse JSON <geonode>/layers/acls. Output: "+output;
			}
		}
		if (!obj.name) {
			return next();
		}
		return fetchUserInfo(obj.name, req, sessionId, next);

	});

}

var fetchUserInfo = function(userName, req, sessionId, next) {

	var client = conn.getPgGeonodeDb();
	var sql = 'SELECT p.id, p.username, g.name ';
		sql += 'FROM people_profile p ';
		sql += 'LEFT JOIN people_profile_groups pg ON pg.profile_id = p.id ';
		sql += 'LEFT JOIN auth_group g ON pg.group_id = g.id ';
		sql += 'WHERE p.username = $1';

	client.query(sql, [userName], function(err, result) {
		if (err) {
			logger.error("\nError on PSQL users query.\nQuery:",sql,"\nusernames:[",userName,"]\nerr:",err,"result:",result,"\n");
			return next(err);
		}
		var groups = [];
		var id = null;
		for (var i = 0; i < result.rows.length; i++) {
			var row = result.rows[i];
			if (row.name) {
				groups.push(row.name);
			}
			id = id || row.id;
		}
		req.userId = id;
		req.groups = groups;
		req.isAdmin = groups.indexOf('admingroup') != -1;
		req.userName = userName;
		sessionCache[sessionId] = userName;
		return next();
	});

};

module.exports = {
	auth: auth,
	anyUser: anyUser,
	anyone: anyone,
	adminOrOwner: adminOrOwner
};


