const LpisCheckInternalImporter = require('./LpisCheckInternalImporter');
const LpisCheckInternalCaseGetter = require('./LpisCheckInternalCaseGetter');

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
	}
}

module.exports = LpisCheckInternalController;