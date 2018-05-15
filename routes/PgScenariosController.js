const PgScenarios = require('../metadata/PgScenarios');

class PgScenariosController {
	constructor(app, pgPool, pgSchema) {
		this._pgScenarios = new PgScenarios(pgPool, pgSchema);

		app.post(`/rest/metadata/scenarios/create`, this.create.bind(this));

		app.get(`/rest/metadata/scenarios/get`, this.get.bind(this));
		app.post(`/rest/metadata/scenarios/get`, this.get.bind(this));
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
		this._pgScenarios.getFiltered(request.body)
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
}

module.exports = PgScenariosController;