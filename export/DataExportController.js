let conn = require('../common/conn');
let logger = require('../common/Logger').applicationWideLogger;
let Scope = require('./Scope');

class DataExportController {
	constructor(app, pool, schemaMap) {
		this.scope = new Scope(pool, conn.getMongoDb(), schemaMap);

		app.get('/export/data/:id', this.exports.bind(this));
		app.post('/import/data', this.imports.bind(this));
	}

	exports(request, response) {
		if(!request.session.user || !request.session.user.hasPermission('export','GET')) {
			response.status(403);
			response.json({status: "Err"});
			return;
		}

		this.scope.exports(request.params.id).then(json => {
			response.json(json);
		}).catch(err => {
			logger.error('DataExportController#exports Error:', err);

			response.status(500);
			response.json({"status": "err"});
		})
	}

	imports(request, response) {
		if(!request.session.user || !request.session.user.hasPermission('import','POST')) {
			response.status(403);
			response.json({status: "Err"});
			return;
		}

		let json = request.body;
		this.scope.imports(json).then(() => {
			response.json({"status": "ok"});
		}).catch(err => {
			logger.error('DataExportController#imports Error:', err);

			response.status(500);
			response.json({"status": "err"});
		})
	}
}

module.exports = DataExportController;