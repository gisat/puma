let Promise = require('promise');

let config = require('../config');

let Geonode = require('../security/Geonode');
let PgUsers = require('./PgUsers');

/**
 * This class handles users coming via the EO SSO. It takes their account information and either return the information
 * about them or it creates a new user.
 */
class SsoAuthentication {
	constructor(pgPool, schema) {
		this.pgUsers = new PgUsers(pgPool, schema);
		this.geonode = new Geonode();
	}

	/**
	 * It prepares information for authentication based on the EO SSO header informations.
	 * It also logs the user in the solution.
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
						return this.login();
					});
				} else {
					request.session.userId = user.id;
					return this.login();
				}
			});
		} else {
			return Promise.resolve(null);
		}
	}

	/**
	 * It logs user to the Geonode as an admin user.
	 */
	login() {
		if(config.geonodeAdminUser) {
			return this.geonode.login(config.geonodeAdminUser.name, config.geonodeAdminUser.password);
		} else {
			return null;
		}
	}
}

module.exports = SsoAuthentication;