const PgScenarioCases = require('../metadata/PgScenarioCases');

class PgScenarioCasesController {
	constructor(app, pgPool, pgSchema) {
		this._pgScenarioCases = new PgScenarioCases(pgPool, pgSchema);

		app.post(`/rest/metadata/scenario_cases/create`, this.create.bind(this));

		app.get(`/rest/metadata/scenario_cases/get`, this.get.bind(this));
		app.get(`/rest/metadata/scenario_cases/get/:scope_id`, this.get.bind(this));
	}

	create(request, response) {
		this._pgScenarioCases.create(request.body)
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
		this._pgScenarioCases.getFiltered(request.params)
			.then((results) => {
				response.status(200).json({
					data: results,
					success: true
				})
			})
			.catch((error) => {
				response.status(500).json({
					message: error.message,
					success: false
				});
			});
	}
}

module.exports = PgScenarioCasesController;