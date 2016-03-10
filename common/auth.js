var http = require('http');
var conn = require('./conn');
var pg = require('pg');
var sessionCache = {};
var config = require('../config');

function anyUser(req, res, next) {
	if (req.userId) {
		return next();
	}
	return next(new Error('unauthorized'))
}

function adminOrOwner(req, res, next) {
	if (req.groups && req.groups.indexOf('admingroup') != -1) {
		return next();
	}

	return next(new Error('unauthorized'));
}

function owner(req,res,next) {

}


function auth(req, res, next) {
	if (!req.cookies){
		return next();
	}
	var sessionId = req.cookies['ssid'];
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

	var sql = 'SELECT p.id, p.username, g.name ';
		sql += 'FROM people_profile p ';
		sql += 'LEFT JOIN people_profile_groups pg ON pg.profile_id = p.id ';
		sql += 'LEFT JOIN auth_group g ON pg.group_id = g.id ';
		sql += 'WHERE p.username = $1';

	conn.pgGeonodeDbClient( function(err, client){
		client.query(sql, [userName], function(err, result) {
			if (err) {
				console.log("\nError on PSQL users query.\nQuery:",sql,"\nusernames:[",userName,"]\nerr:",err,"result:",result,"\n");
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
	});

};

module.exports = {
	auth: auth,
	anyUser: anyUser,
	adminOrOwner: adminOrOwner
};


