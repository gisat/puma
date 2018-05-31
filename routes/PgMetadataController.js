const PgMetadata = require('../metadata/PgMetadata');

class PgMetadataController {
	constructor(app, pgPool, pgSchema) {
		this._pgMetadata = new PgMetadata(pgPool, pgSchema);

		app.post(`/rest/metadata`, this.create.bind(this));

		app.get(`/rest/metadata`, this.get.bind(this));
		app.post(`/rest/metadata/filtered`, this.get.bind(this));

		app.delete(`/rest/metadata`, this.delete.bind(this));

		app.put(`/rest/metadata`, this.update.bind(this))
	}

	create(request, response) {
		this._pgMetadata.create(request.body.data)
			.then((metadata) => {
				response.status(200).json({
					data: metadata,
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
		this._pgMetadata.get(_.assign({}, request.query, request.body))
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
		this._pgMetadata.delete(request.params.id || request.body.id)
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
		this._pgMetadata.update(request.body)
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

module.exports = PgMetadataController;