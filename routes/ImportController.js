var Controller = require('./Controller');
var logger = require('../common/Logger').applicationWideLogger;
var PgCsvLayer = require('../layers/PgCsvLayer');

class ImportController extends Controller {
    constructor(app, pgPool) {
        super(app, 'import', PgCsvLayer);

        app.post('/rest/import/csv', this.csv.bind(this));

        this._pgPool = pgPool;
    }

    csv(request, response, next) {
        new PgCsvLayer().import(request, this._pgPool).then(function (result, error) {
            response.send(result);
        });
    }
}

module.exports = ImportController;