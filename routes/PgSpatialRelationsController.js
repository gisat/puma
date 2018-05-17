const PgSpatialRelations = require('../metadata/PgSpatialRelations');

class PgScenariosController {
	constructor(app, pgPool, pgSchema) {
		this._pgSpatialRelations = new PgSpatialRelations(pgPool, pgSchema);

		app.post(`/rest/metadata/spatial_relations`, this.create.bind(this));

		app.get(`/rest/metadata/spatial_relations`, this.get.bind(this));
		app.post(`/rest/metadata/spatial_relations/filtered`, this.get.bind(this));

		app.delete(`/rest/metadata/spatial_relations/:id`, this.delete.bind(this));

		app.put(`/rest/metadata/spatial_relations`, this.update.bind(this))
	}

	create(request, response) {
		this._pgSpatialRelations.create(request.body)
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
		this._pgSpatialRelations.get(request.body)
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
		this._pgSpatialRelations.delete(request.params.id || request.body.id)
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
		this._pgSpatialRelations.update(request.body)
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