let Promise = require('promise');

let logger = require('../common/Logger').applicationWideLogger;

/**
 * This class handles the use cases where the authentication goes through multiple asynchronous steps.
 */
class CompoundAuthentication {
	constructor(authenticators) {
		this.authenticators = authenticators;
	}

	/**
	 * It returns id of the logged in user.
	 * @param request
	 * @param response
	 * @param next
	 * @returns {Promise.<Number>}
	 */
	authenticate(request, response, next) {
		logger.info('CompoundAuthentication#authenticate');

		let promise = Promise.resolve(null);
		this.authenticators.forEach(authenticator => {
			promise = promise.then(() => {
				logger.info('CompoundAuthentication#authenticate Resolved promise');
				return authenticator.authenticate(request, response, next)
			});
		});
		return promise;
	}
}

module.exports = CompoundAuthentication;