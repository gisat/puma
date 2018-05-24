const PgSpatialDataSources = require('../metadata/PgSpatialDataSources');

class PgScenariosController {
	constructor(app, pgPool, pgSchema) {
		this._pgSpatialDataSources = new PgSpatialDataSources(pgPool, pgSchema);

		app.post(`/rest/metadata/spatial_data_sources`, this.create.bind(this));

		app.get(`/rest/metadata/spatial_data_sources`, this.get.bind(this));
		app.post(`/rest/metadata/spatial_data_sources/filtered`, this.get.bind(this));

		app.delete(`/rest/metadata/spatial_data_sources/:id`, this.delete.bind(this));

		app.put(`/rest/metadata/spatial_data_sources`, this.update.bind(this))
	}

	create(request, response) {
		this._pgSpatialDataSources.create(request.body)
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
		this._pgSpatialDataSources.get(_.assign({}, request.query, request.body))
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
		this._pgSpatialDataSources.delete(request.params.id || request.body.id)
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
		this._pgSpatialDataSources.update(request.body)
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