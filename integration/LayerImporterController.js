let LayerImporterTasks = require('./LayerImporterTasks');
let LayerImporter = require('./LayerImporter');

class LayerImporterController {
    constructor(app, mongo, pgPool) {
        app.get('/rest/layerImporter/status/:id', this.getLayerImportStatus.bind(this));
        app.post('/rest/layerImporter/import', this.importLayer.bind(this));
        
        this._mongo = mongo;
        this._pgPool = pgPool;
        this._layerImporterTasks = new LayerImporterTasks();
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
        let layerImporter = new LayerImporter(this._pgPool, this._mongo, this._layerImporterTasks);
        
        this.getImportInputs(request).then(inputs => {
            layerImporter.importLayer(inputs);
            response.send(layerImporter.getCurrentImporterTask());
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
                file: request.files.layer.path,
                name: request.files.layer.originalFilename || request.files.layer.name,
                customName: request.body.name,
                user: {
                    id: request.session.user.id
                }
            }
        });
    }
}

module.exports = LayerImporterController;