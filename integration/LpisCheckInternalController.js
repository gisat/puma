const LpisCheckInternalImporter = require('./LpisCheckInternalImporter');

class LpisCheckInternalController {
	constructor(app, pgPool) {
		this._app = app;
		this._pgPool = pgPool;

		this._app.post('/rest/import/lpisCheck', (request, response) => {
			new LpisCheckInternalImporter(pgPool).importCases(request, response);
		});
	}
}

module.exports = LpisCheckInternalController;