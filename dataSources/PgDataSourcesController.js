const PgDataSources = require('./PgDataSources');

class PgDataSourcesController {
	constructor(app, pgPool, pgSchema) {
		this._pgDataSources = new PgDataSources(pgPool, pgSchema);

		app.post(`/rest/dataSources`, this.create.bind(this));
		app.post(`/rest/dataSources/filtered/:type`, this.get.bind(this));
		app.put(`/rest/dataSources`, this.update.bind(this))
	}

	create(request, response) {
		this._pgDataSources.create(request.body.data, request.session.user)
			.then(([data, errors]) => {
				response.status(200).json({
					data: data,
					errors: errors,
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
		this._pgDataSources.get(request.params['type'], _.assign({}, request.query, request.body), request.session.user)
			.then((payload) => {
				payload.success = true;
				response.status(200).json(payload)
			})
			.catch((error) => {
				console.log(error);
				response.status(500).json({
					message: error.message,
					success: false
				});
			});
	}

	delete(request, response) {
		this._pgDataSources.delete(request.params.id || request.body.id, request.session.user)
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
		this._pgDataSources.update(request.body, request.session.user)
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

module.exports = PgDataSourcesController;