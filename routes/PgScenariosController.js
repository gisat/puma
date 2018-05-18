const PgScenarios = require('../metadata/PgScenarios');

class PgScenariosController {
	constructor(app, pgPool, pgSchema) {
		this._pgScenarios = new PgScenarios(pgPool, pgSchema);

		app.post(`/rest/metadata/scenarios`, this.create.bind(this));

		app.get(`/rest/metadata/scenarios`, this.get.bind(this));
		app.post(`/rest/metadata/scenarios/filtered`, this.get.bind(this));

		app.delete(`/rest/metadata/scenarios/:id`, this.delete.bind(this));

		app.put(`/rest/metadata/scenarios`, this.update.bind(this))
	}

	create(request, response) {
		this._pgScenarios.create(request.body)
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
		this._pgScenarios.get(_.assign({}, request.query, request.body))
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
		this._pgScenarios.delete(request.params.id || request.body.id)
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
		this._pgScenarios.update(request.body)
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

module.exports = PgScenariosController;