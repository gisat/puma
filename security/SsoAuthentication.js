let Promise = require('promise');

let PgAuthentication = require('./PgAuthentication');
let PgUsers = require('./PgUsers');

/**
 * This class handles users coming via the EO SSO. It takes their account information and either return the information
 * about them or it creates a new user.
 */
class SsoAuthentication {
	constructor(pgPool, schema) {
		this.pgUsers = new PgUsers(pgPool, schema);
	}

	/**
	 * It prepares information for authentication based on the EO SSO header informations.
	 * @param request
	 * @returns {Promise}
	 */
	authenticate(request) {
		if(request.headers['umsso-person-email'] && request.headers['umsso-person-email'] != '') {
			var email = request.headers['umsso-person-email'];
			return this.pgUsers.byEmail(email).then(user => {
				if(!user) {
					return this.pgUsers.add(email).then(userId => {
						request.session.userId = userId;
					});
				} else {
					request.session.userId = user.id;
				}
			});
		} else {
			return Promise.resolve(null);
		}
	}
}

module.exports = SsoAuthentication;