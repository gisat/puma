const LpisCheckInternalImporter = require('./LpisCheckInternalImporter');
const LpisCheckInternalCaseGetter = require('./LpisCheckInternalCaseGetter');
const LpisCheckInternalExporter = require('./LpisCheckInternalExporter');

class LpisCheckInternalController {
	constructor(app, pgPool) {
		this._app = app;
		this._pgPool = pgPool;

		this._app.post('/rest/import/lpisCheck', (request, response) => {
			new LpisCheckInternalImporter(pgPool).importCases(request, response);
		});

		this._app.get('/rest/project/lpisCheck', (request, response) => {
			new LpisCheckInternalCaseGetter(pgPool).getCase(request, response);
		});

		this._app.post('/rest/export/lpisCheck', (request, response) => {
			new LpisCheckInternalExporter(pgPool).export(request, response);
		})

		this._app.get('/rest/project/lpisCheck/setPermissions', (request, response) => {
			new LpisCheckInternalImporter(pgPool).setPermissionsForExistingLpisCheckInternalCases()
				.then(() => {
					response.status(200).send("DONE!");
				})
				.catch((error) => {
					response.status(500).send(`ERROR#${error.message}`);
				})
		})

		this._app.post('/rest/project/lpisCheck/ensureUsers', (request, response) => {
			new LpisCheckInternalImporter(pgPool).ensureUsers(request, response);
		})
	}
}

module.exports = LpisCheckInternalController;