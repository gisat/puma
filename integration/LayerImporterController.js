let logger = require('../common/Logger').applicationWideLogger;

let LayerImporterTasks = require('./LayerImporterTasks');
let LayerImporter = require('./LayerImporter');

class LayerImporterController {
    constructor(app, mongo, pgPool, schema) {
        app.get('/rest/layerImporter/status/:id', this.getLayerImportStatus.bind(this));
        app.post('/rest/layerImporter/import', this.importLayer.bind(this));
        app.post('/rest/layerImporter/importNoStatistics', this.importNoStatisticsLayer.bind(this));
        app.post('/rest/importer/layer', this.importLayerWithoutMapping.bind(this));

        this._mongo = mongo;
        this._pgPool = pgPool;
        this._layerImporterTasks = new LayerImporterTasks();
        this._layerImporter = new LayerImporter(pgPool, mongo, this._layerImporterTasks, schema);
    }

    /**
     * Return status of layer import
     * @param request
     * @param response
     */
    getLayerImportStatus(request, response) {
        response.send(this._layerImporterTasks.getImporterTask(request.params['id']));
    }

    /**
     * Execute import of new layer
     * @param request
     * @param response
     */
    importLayer(request, response) {
        logger.info('LayerImporterController#importLayer');

        this.getImportInputs(request).then(inputs => {
            this._layerImporter.importLayer(inputs);
            response.send(this._layerImporter.getCurrentImporterTask());
        }).catch(error => {
            response.send({
                message: error.message,
                success: false
            })
        });
    }

    /**
     * Execute import of the layer without generating statistics for it.
     * @param request
     * @param response
     */
    importNoStatisticsLayer(request, response) {
        logger.info('LayerImporterController#importNoStatisticsLayer');

        this.getImportInputs(request).then(inputs => {
            this._layerImporter.importLayerWithoutStatistics(inputs);
            response.send(this._layerImporter.getCurrentImporterTask());
        }).catch(error => {
            response.send({
                message: error.message,
                success: false
            })
        });
    }

    /**
     * Execute import of the layer without statistics and mapping of the layer. It is useful mainly for uploading the layers
     * which should be used as analytical units.
     * @param request
     * @param response
     */
    importLayerWithoutMapping(request, response) {
        logger.info('LayerImporterController#importLayerWithoutMapping Body: ', request.body);

        this.getImportInputs(request).then(inputs => {
            this._layerImporter.importLayerWithoutMapping(inputs);
            response.send(this._layerImporter.getCurrentImporterTask());
        }).catch(error => {
            response.send({
                message: error.message,
                success: false
            })
        });
    }

    /**
     * Return parsed import inputs from request
     * @param request
     */
    getImportInputs(request) {
        return Promise.resolve().then(() => {
            return {
                scope: request.body.scope,
                theme: request.body.theme,
                url: request.body.url,
                file: request.files.file.path,
                name: request.files.file.originalFilename || request.files.file.name,
                customName: request.body.name,
                user: {
                    id: request.session.user.id
                }
            }
        });
    }
}

module.exports = LayerImporterController;