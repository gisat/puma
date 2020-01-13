class PgController {
	constructor(app, pgPool, pgSchema, group) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;

		this._crud = null;

		if (group === `user`) {
			app.get(`/rest/${group}/current`, this.getCurrent.bind(this));
		}

		app.post(`/rest/${group}`, this.create.bind(this));

		app.get(`/rest/${group}`, this.get.bind(this));
		app.get(`/rest/${group}/:type`, this.get.bind(this));
		app.post(`/rest/${group}/filtered`, this.get.bind(this));
		app.post(`/rest/${group}/filtered/:type`, this.get.bind(this));

		app.post(`/rest/${group}/count/:type`, this.get.bind(this, true));

		app.delete(`/rest/${group}`, this.delete.bind(this));

		app.put(`/rest/${group}`, this.update.bind(this));
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

	get(doCountOnly, request, response) {
		return this._crud.get(request.params['type'], _.assign({}, request.query, request.body), request.session.user, doCountOnly)
			.then((payload) => {
				payload.success = true;
				response.status(200).json(payload);
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

	getCurrent() {
		throw new Error(`has to be rewriten`);
	}
}

module.exports = PgController;