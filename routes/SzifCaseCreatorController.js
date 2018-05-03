const SzifCaseCreator = require(`../integration/SzifCaseCreator`);

const config = require(`../config`);

class SzifCaseCreatorController {
	constructor(app, pgPool, mongo) {
		this._pgPool = pgPool;
		this._mongo = mongo;

		app.post(`/rest/szif/case`, this.createNewSzifCase.bind(this));
	}

	createNewSzifCase(request, response) {
		new SzifCaseCreator(this._pgPool, this._mongo).create(
			request.body.name,
			request.body.scopeId,
			request.files.changeReviewFileBefore.path,
			request.files.changeReviewFileAfter.path
		).then(() => {
			response.status(200).json({
				data: {},
				success: true
			});
		}).catch((error) => {
			console.log(`SzifCaseCreatorController: error`, error);
			response.status(500).json({
				message: error.message,
				success: false
			});
		});
	}
}

module.exports = SzifCaseCreatorController;