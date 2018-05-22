const UploadManager = require('../integration/UploadManager');

const config = require('../config');

class UploadManagerController {
	constructor(app, pgPool, pgSchema, pantherDataStoragePath) {
		app.get(`/rest/integration/upload_manager`, this.get.bind(this));
		app.post(`/rest/integration/upload_manager/filtered`, this.get.bind(this));

		this._uploadManager = new UploadManager(pgPool, pgSchema, `${pantherDataStoragePath}/upload_manager/uploads`)
	}

	get(request, response) {
		this._uploadManager.get(_.assign({}, request.query, request.body))
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
}

module.exports = UploadManagerController;