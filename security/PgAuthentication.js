let logger = require('../common/Logger').applicationWideLogger;

let Group = require('../security/Group');
let User = require('../security/User');

let PgUsers = require('../security/PgUsers');
let PgPermissions = require('../security/PgPermissions');


/**
 * This class governs the authentication based on the PostgreSQL user database.
 */
class PgAuthentication {
	constructor(pgPool, schema) {
		this.pgUsers = new PgUsers(pgPool, schema);
		this.pgPermissions = new PgPermissions(pgPool, schema);
	}

	/**
	 * If the user with given userId exists in the system, it loads it and supply it. If there is none such
	 * @param request
	 * @return {Promise.<Number>} Null if the user is guest, otherwise the id of current user.
	 */
	authenticate(request) {
		logger.info('PgAuthentication#authenticate UserId: ', request.session.userId);

		if (request.session.userId) {
			return this.pgUsers.byId(request.session.userId).then(user => {
				logger.info('PgAuthentication#authenticate User: ', user.id);
				request.session.user = user;
			});
		} else {
			return this.pgPermissions.forGroup(Group.guestId()).then((permissions => {
				logger.info('PgAuthentication#authenticate Guest');
				request.session.user = new User(0, [], [new Group(Group.guestId(), permissions)]);
			}));
		}
	}
}

module.exports = PgAuthentication;