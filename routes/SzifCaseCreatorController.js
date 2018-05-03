const SzifCaseCreator = require(`../integration/SzifCaseCreator`);
const PgPermissions = require('../security/PgPermissions');
const Permission = require('../security/Permission');

class SzifCaseCreatorController {
	constructor(app, pgPool, mongo, schema) {
		this._pgPool = pgPool;
		this._mongo = mongo;

        this.permissions = new PgPermissions(pgPool, schema);
        app.post(`/rest/szif/case`, this.createNewSzifCase.bind(this));
	}

	createNewSzifCase(request, response) {
		new SzifCaseCreator(this._pgPool, this._mongo).create(
			request.body.name,
			request.body.scopeId,
			request.files.changeReviewFileBefore.path,
			request.files.changeReviewFileAfter.path
		).then(result => {
            return Promise.all([
                this.permissions.add(request.session.userId, 'location', result._id, Permission.READ),
                this.permissions.add(request.session.userId, 'location', result._id, Permission.UPDATE),
                this.permissions.add(request.session.userId, 'location', result._id, Permission.DELETE)
            ]);
		}).then(() => {
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