const PgController = require(`src/common/PgController`);
const PgUsersCrud = require('./PgUsersCrud');
const PgUserCurrent = require('./PgUserCurrent');

class PgUserController extends PgController {
	constructor(app, pgPool, pgSchema, mongo) {
		super(app, pgPool, pgSchema, `user`);

		this._crud = new PgUsersCrud(pgPool, pgSchema, mongo);
	}

	getCurrent(request, response) {
		new PgUserCurrent(this._pgPool, this._pgSchema, request.session.user.id)
			.getCurrent()
			.then((currentUser) => {
				response.status(200).json(currentUser)
			});
	};
}

module.exports = PgUserController;