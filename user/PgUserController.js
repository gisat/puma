const PgController = require(`../common/PgController`);
const PgUsersCrud = require('../user/PgUsersCrud');
const PgUserCurrent = require('../user/PgUserCurrent');
const PgUserBatch = require('./PgUserBatch');

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

	createBatch(request, response) {
		new PgUserBatch(this._pgPool, this._pgSchema, request.session.user.id)
			.create(request.body)
			.then((batchResult) => {
				console.log(batchResult);
				response.status(200).json(batchResult);
			})
			.catch((error) => {
				console.log(error);
				response.status(500).json({
					success: false,
					message: error.message
				})
			})
	}
}

module.exports = PgUserController;