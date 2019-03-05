const PgMetadataCrud = require('../metadata/PgMetadataCrud');

class PgMetadataController {
	constructor(app, pgPool, pgSchema) {
		this._crud = new PgMetadataCrud(pgPool, pgSchema);

		app.post(`/rest/metadata`, this.create.bind(this));

		app.get(`/rest/metadata`, this.get.bind(this));
		app.get(`/rest/metadata/:type`, this.get.bind(this));
		app.post(`/rest/metadata/filtered`, this.get.bind(this));
		app.post(`/rest/metadata/filtered/:type`, this.get.bind(this));

		app.delete(`/rest/metadata`, this.delete.bind(this));

		app.put(`/rest/metadata`, this.update.bind(this))
	}

	create(request, response) {
		this._crud.create(
			this._isJson(request.body.data) ? JSON.parse(request.body.data) : request.body.data,
			request.session.user,
			{
				files: request.files,
				configuration: this._isJson(request.body.configuration) ? JSON.parse(request.body.configuration) : request.body.configuration
			}
		).then(([metadata, errors]) => {
			response.status(200).json({
				data: metadata,
				errors: errors,
				success: true
			})
		}).catch((error) => {
			console.log(`ERROR # PgMetadataController # ERROR`, error);
			if (error.message === 'Forbidden') {
				response.status(403).json({
					message: error.message,
					success: false
				})
			} else {
				response.status(500).json({
					message: error.message,
					success: false
				})
			}
		});
	}

	get(request, response) {
		this._crud.get(request.params['type'], _.assign({}, request.query, request.body), request.session.user)
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
		this._crud.delete(request.body.data, request.session.user)
			.then((data) => {
				response.status(200).json({
					data: data,
					success: true
				});
			})
			.catch((error) => {
				console.log(`PgMetadataController#error`, error);
				response.status(500).json({
					message: error.message,
					success: false
				});
			});
	}

	update(request, response) {
		this._crud.update(
			this._isJson(request.body.data) ? JSON.parse(request.body.data) : request.body.data,
			request.session.user,
			{
				files: request.files,
				configuration: this._isJson(request.body.configuration) ? JSON.parse(request.body.configuration) : request.body.configuration
			}
		).then((data) => {
			response.status(200).json({
				data: data,
				success: true
			});
		}).catch((error) => {
			console.log(`PgMetadataController#error`, error);
			response.status(500).json({
				message: error.message,
				success: false
			});
		});
	}

	_isJson(str) {
		try {
			JSON.parse(str);
		} catch (e) {
			return false;
		}
		return true;
	}
}

module.exports = PgMetadataController;