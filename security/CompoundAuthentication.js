let Promise = require('promise');

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
		let promise = Promise.resolve(null);
		this.authenticators.forEach(authenticator => {
			promise = promise.then(authenticator.authenticate(request, response, next));
		});
		return promise;
	}
}

module.exports = CompoundAuthentication;