const PgController = require(`../common/PgController`);
const PgUsersCrud = require('../user/PgUsersCrud');
const PgUserCurrent = require('../user/PgUserCurrent');
const PgUserBatch = require('./PgUserBatch');

class PgUserController extends PgController {
	constructor(app, pgPool, pgSchema, initRelatedStores) {
		super(app, pgPool, pgSchema, `user`);

		this._crud = new PgUsersCrud(pgPool, pgSchema, initRelatedStores);
	}

	getCurrent(request, response) {
		response.status(200).json(request.user);
	};

	createBatch(request, response) {
		new PgUserBatch(this._pgPool, this._pgSchema, request.user.key)
			.create(request.body)
			.then((batchResult) => {
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