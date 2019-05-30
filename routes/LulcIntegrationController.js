const superagent = require('superagent');
const conn = require('../common/conn');
const config = require('../config');

const MetadataForIntegration = require('../integration/lulc/MetadataForIntegration');
const GeoJsonToSql = require('../integration/lulc/GeoJsonToSql');
const Uuid = require('../common/UUID');

const LulcStatus = require('../integration/lulc/LulcStatus');
const Places = require('../integration/lulc/Places');

class LulcIntegrationController {
    constructor(app, mongo, pgPool, idProvider) {
        this._mongo = mongo;
        this._pgPool = pgPool;

        this._idProvider = idProvider || conn.getNextId();
        this._places = new Places(pgPool, mongo);

        app.get('/rest/integration/lulc', this.retrieveStateOfIntegration.bind(this));
        app.post('/rest/integration/lulcmeta', this.integrateResults.bind(this));
        app.post('/rest/integration/lulc', this.integrateData.bind(this));
    }

    async retrieveStateOfIntegration(request, response) {
        const uuid = request.query.uuid;
        const status = await new LulcStatus(this._mongo, uuid).status();
        response.json(status);
    }

    async integrateResults(request, response) {
        console.log('Integrate Results: ', request.body);

        const uuid = request.body.uuid;
        const status = new LulcStatus(this._mongo, uuid);

        if (request.body.error) {
            await status.error(request.body.error);

            response.json({});
            return;
        }

        try {
            const inputForAnalysis = request.body;
            const metadata = new MetadataForIntegration(this._mongo, inputForAnalysis._id);
            const layerRefs = metadata.layerRefs(inputForAnalysis, this._idProvider.getNextId());
            await status.update('LayerRefs Inserted');

            const sql = inputForAnalysis.analyticalUnitLevels.map((auLevel, index) => {
                return new GeoJsonToSql(auLevel.layer, auLevel.table, index + 1).sql();
            }).join(' ');

            await this._pgPool.query(sql);
            await this._mongo.collection('layerref').insertMany(layerRefs);

            await this._places.addAttributes(layerRefs);
            await status.update('Done');
            response.json({});
        } catch (error) {
            await status.error(error);
            response.json({});
        }
    }

    /**
     * Create new place based on provided name and names of the analytical unit layers. Gather the metadata necessary
     * for processing. Move the processing to the remote server.
     */
    async integrateData(request, response) {
        const scopeId = Number(request.body.scopeId);
        const placeName = request.body.placeName;
        const placeBbox = request.body.bbox;
        const databaseTables = request.body.analyticalLevels && request.body.analyticalLevels.length && request.body.analyticalLevels.filter(au => au) || [];
        const files = request.files;

        const uuid = new Uuid().toString();
        const status = new LulcStatus(this._mongo, uuid);
        try {
            await status.create();

            const placeId = this._idProvider.getNextId();
            await this._places.create(placeId, scopeId, placeName, placeBbox, databaseTables);
            await status.update('Place Created');

            const sourceForIntegration = new MetadataForIntegration(this._mongo, scopeId);
            const integrationInput = await sourceForIntegration.metadata(placeId, uuid, config.lulcUrl);
            await status.update('Metadata Loaded');
            await sourceForIntegration.layers(integrationInput, files);
            await status.update('Layers Loaded');
            integrationInput.analyticalUnitLevels.forEach((auLevel, index) => {
                auLevel.table = databaseTables[index];
            });

            // Process the files and integrate them into the JSON.
            await superagent.post(config.remoteLulcProcessorUrl)
                .send(integrationInput);
            await status.update('Remote processing');

            response.json({
                status: 'running',
                uuid: uuid
            });
        } catch (err) {
            console.log('Error: ', err);

            await status.error(err);

            response.json({
                status: 'err',
                message: err
            })
        }
    }
}

module.exports = LulcIntegrationController;