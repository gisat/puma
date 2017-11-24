let config = require(`../config`);

let superagent = require('superagent');

let Controller = require('./Controller');
let logger = require('../common/Logger').applicationWideLogger;
let PgCsvLayer = require('../layers/PgCsvLayer');
let GeoserverImporter = require(`../layers/GeoServerImporter`);

class ImportController extends Controller {
    constructor(app, pgPool) {
        super(app, 'import', PgCsvLayer);

        app.post('/rest/import/csv', this.csv.bind(this));

        app.post(`/rest/import/layer`, this.layer.bind(this));

        this._pgPool = pgPool;

        this._geoserverImporter = new GeoserverImporter(
            `${config.remoteProtocol}://${config.remoteAddress}${config.geoserverPath}`,
            config.geoserverUsername,
            config.geoserverPassword,
            `geonode`,
            `datastore`,
            this._pgPool
        );
    }

    csv(request, response, next) {
        new PgCsvLayer().import(request, this._pgPool).then(function (result, error) {
            response.send(result);
        }).catch(error => {
            response.status(500).send(error);
        });
    }

    layer(request, response, next) {
        let systemName = request.files.layer.name.toLowerCase().substring(0, -4);
        this._geoserverImporter.importLayer(
            {
                type: `vector`,
                systemName: systemName,
                file: request.files.layer.path
            },
            true
        ).then(() => {
            return superagent
                .get(`http://localhost/cgi-bin/updatelayers?f=${systemName}&s=datastore&w=geonode`);
        }).then(() => {
            response.status(200).send(
                {
                    success: true
                }
            );
        }).catch((error) => {
            console.log(`# ERROR # ImportController #`, error);
            response.status(500).send(
                {
                    message: error.message,
                    success: false
                }
            );
        });
    }
}

module.exports = ImportController;