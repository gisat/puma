let logger = require('../common/Logger').applicationWideLogger;

class AuthController {
	anyUser(request, response, next) {
		if (request.session.userId) {
			return next();
		} else {
			logger.info(`Unauthenticated, url=${request.url}.`);
			response.status(401).end();
		}
	}

	adminOrOwner(request, response, next) {
		if (request.session.groups && request.session.groups.indexOf("admingroup") != -1) {
			return next();
		} else {
			logger.info(`Forbidden, adminOrOwner required, user=${request.session.userName}, url=${request.url}.`);
			response.status(403).end();
		}
	}
}

module.exports = AuthController;
