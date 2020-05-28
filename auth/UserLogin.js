const jwt = require('jsonwebtoken');

const config = require('../config');

class UserLogin {
	constructor(pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
	}

	login(request, response) {
		this.getUser(request.body.email, request.body.password)
			.then((user) => {
				let jwtSecret;
				if(config.jsonWebToken.string) {
					jwtSecret = config.jsonWebToken.string;
				}
				response.cookie("auth", jwt.sign(user.key, jwtSecret), {maxAge: config.jsonWebToken.cookieMaxAge});
				response.send({
					success: true
				});
			})
			.catch((error) => {
				response
					.status(401)
					.send({
						success: false,
						error: error
					});
			})
	}

	getUser(email, password) {
		return this._pgPool
			.query(`SELECT * FROM "${this._pgSchema}"."users" WHERE "email" = '${email}' AND "password" = crypt('${password}', "password")`)
			.then((pgResult) => {
				let user = pgResult.rows[0];
				if(!user) {
					throw {code: 1, application: null, message: "wrong email of password"};
				} else {
					return user;
				}
			})
	}
}

module.exports = UserLogin;