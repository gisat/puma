const PgUser = require('../metadata/PgUser');
const PgUserCurrent = require('../metadata/PgUserCurrent');

class PgUserController {
	constructor(app, pgPool, pgSchema, mongo) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;

		this._pgUser = new PgUser(pgPool, pgSchema, mongo);

		app.get(`/rest/user/current`, this.getCurrent.bind(this));

		app.post(`/rest/user`, this.create.bind(this));

		// app.get(`/rest/user`, this.get.bind(this));
		// app.get(`/rest/user/:type`, this.get.bind(this));
		// app.post(`/rest/user/filtered`, this.get.bind(this));
		app.post(`/rest/user/filtered/:type`, this.get.bind(this));

		app.delete(`/rest/user`, this.delete.bind(this));

		app.put(`/rest/user`, this.update.bind(this))
	}

	create(request, response) {
		this._pgUser.create(
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
			console.log(`ERROR # PgUserController # ERROR`, error);
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
		this._pgUser.get(request.params['type'], _.assign({}, request.query, request.body), request.session.user)
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
		this._pgUser.delete(request.body.data, request.session.user)
			.then((data) => {
				response.status(200).json({
					data: data,
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
		this._pgUser.update(
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
			console.log(`PgUserController#error`, error);
			response.status(500).json({
				message: error.message,
				success: false
			});
		});
	}

	getCurrent(request, response) {
		new PgUserCurrent(this._pgPool, this._pgSchema, request.session.user.id)
			.getCurrent()
			.then((currentUser) => {
				response.status(200).json(currentUser)
			});
	};

	_isJson(str) {
		try {
			JSON.parse(str);
		} catch (e) {
			return false;
		}
		return true;
	}
}

module.exports = PgUserController;