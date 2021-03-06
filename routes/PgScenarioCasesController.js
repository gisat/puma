const PgScenarioCases = require('../metadata/PgScenarioCases');
const PgScenarios = require('../metadata/PgScenarios');

class PgScenarioCasesController {
	constructor(app, pgPool, pgSchema) {
		this._pgScenarioCases = new PgScenarioCases(pgPool, pgSchema);

		this._pgScenarioCases.setPgScenariosClass(new PgScenarios(pgPool, pgSchema));

		app.post(`/rest/metadata/scenario_cases`, this.create.bind(this));

		app.get(`/rest/metadata/scenario_cases`, this.get.bind(this));
		app.post(`/rest/metadata/scenario_cases/filtered`, this.get.bind(this));

		app.delete(`/rest/metadata/scenario_cases/:id`, this.delete.bind(this));

		app.put(`/rest/metadata/scenario_cases`, this.update.bind(this))
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
		this._pgScenarioCases.get(_.assign({}, request.query, request.body))
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
		this._pgScenarioCases.delete(request.params.id || request.body.id)
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
		this._pgScenarioCases.update(request.body)
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

module.exports = PgScenarioCasesController;