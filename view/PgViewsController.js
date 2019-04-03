const PgViewsCrud = require('../view/PgViewsCrud');

class PgViewsController {
	constructor(app, pgPool, pgSchema) {
		this._crud = new PgViewsCrud(pgPool, pgSchema);

		app.post(`/rest/views`, this.create.bind(this));

		app.get(`/rest/views`, this.get.bind(this));
		app.get(`/rest/views/:type`, this.get.bind(this));
		app.post(`/rest/views/filtered`, this.get.bind(this));
		app.post(`/rest/views/filtered/:type`, this.get.bind(this));

		app.delete(`/rest/views`, this.delete.bind(this));

		app.put(`/rest/views`, this.update.bind(this))
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
			console.log(`ERROR # PgApplicationController # ERROR`, error);
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
				console.log(`ERROR # PgApplicationController # ERROR`, error);
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
				console.log(`ERROR # PgApplicationController # ERROR`, error);
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
			console.log(`ERROR # PgApplicationController # ERROR`, error);
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

module.exports = PgViewsController;