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


/**
 * It does nothing else then fills the req with session variables if they are known.
 */
function auth(req, res, next) {
	var ssid = req.cookies["ssid"];
	if (ssid){
		var userInfo = sessionCache[ssid];
		if (userInfo) {
			req.userId = userInfo.userId;
			req.groups = userInfo.groups;
			req.isAdmin = userInfo.isAdmin;
			req.userName = userInfo.userName;
		}
	}
	return next();
}


module.exports = {
	auth: auth,
	anyUser: anyUser,
	anyone: anyone,
	adminOrOwner: adminOrOwner,
	sessionCache: sessionCache
};


