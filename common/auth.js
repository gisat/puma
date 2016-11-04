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


module.exports = {
	anyUser: anyUser,
	adminOrOwner: adminOrOwner
};
