const jwt = require('jsonwebtoken');

const config = require('../config');

const PgUserCurrent = require('../user/PgUserCurrent');

class UserAuthentication {
	constructor(pgPool) {
		this._pgPool = pgPool;
	}

	authenticate(request, response, next) {
		let jwtSecret;
		if(config.jsonWebToken.string) {
			jwtSecret = config.jsonWebToken.string;
		}

		let userKey;
		if(request.cookies.auth) {
			userKey = jwt.decode(request.cookies.auth, jwtSecret);
		}

		new PgUserCurrent(this._pgPool, config.pgSchema.user, userKey)
			.getCurrent()
			.then((user) => {
				if(!userKey) {
					response.cookie("auth", jwt.sign(user.key, jwtSecret), {maxAge: config.jsonWebToken.cookieMaxAge});
				}
				request.user = user;
				next();
			});
	}
}

module.exports = UserAuthentication;