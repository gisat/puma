const PgRelations = require('../metadata/PgRelations');

class PgRelationsController {
	constructor(app, pgPool, pgSchema) {
		this._pgRelations = new PgRelations(pgPool, pgSchema);

		app.post(`/rest/relations`, this.create.bind(this));
		app.post(`/rest/relations/filtered/:type`, this.get.bind(this));
		app.put(`/rest/relations`, this.update.bind(this))
	}

	create(request, response) {
		this._pgRelations.create(request.body.data, request.session.user)
			.then((scenario) => {
				response.status(200).json({
					data: scenario,
					success: true
				})
			})
			.catch((error) => {
				response.status(500).json({
					message: error.message,
					success: false
				})
			});
	}

	get(request, response) {
		this._pgRelations.get(request.params['type'], _.assign({}, request.query, request.body), request.session.user)
			.then((payload) => {
				payload.success = true;
				response.status(200).json(payload)
			})
			.catch((error) => {
				response.status(500).json({
					message: error.message,
					success: false
				});
			});
	}

	delete(request, response) {
		this._pgRelations.delete(request.params.id || request.body.id, request.session.user)
			.then(() => {
				response.status(200).json({
					success: true
				});
			})
			.catch((error) => {
				response.status(500).json({
					message: error.message,
					success: false
				});
			});
	}

	update(request, response) {
		this._pgRelations.update(request.body, request.session.user)
			.then((payload) => {
				payload.success = true;
				response.status(200).json(payload);
			})
			.catch((error) => {
				response.status(500).json({
					message: error.message,
					success: false
				});
			});
	}
}

module.exports = PgRelationsController;