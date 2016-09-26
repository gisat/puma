var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;

var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var FilteredPgLayer = require('../layers/FilteredPgLayer');

class ExportController {
    constructor(app) {
        this._connection = conn.getMongoDb();

        app.get('/export/shapefile', this.shapefile.bind(this));
        app.get('/export/csv', this.csv.bind(this));
    }

    shapefile(request, response, next) {
        var location = Number(request.query.location);
        var year = Number(request.query.year);
        var areaTemplate = Number(request.query.areaTemplate);
        var layerRefsForExport = new FilteredMongoLayerReferences({
            location: location,
            year: year,
            areaTemplate: areaTemplate,
            isData: false
        }, this._connection);
        return layerRefsForExport.read().then(function(layerReferences){
            if(layerReferences.length < 1) {
                throw new Error(
                    logger.error('ExportController#shapefile There is no layer for given location: ', location, ' year: ', year, ' areaTemplate: ', areaTemplate)
                );
            }
            if(layerReferences.length > 1) {
                logger.warn('ExportController#shapefile There are multiple layers for given combination. First one is used. Location: ', location, ' year: ', year, ' areaTemplate: ', areaTemplate);
            }
            return new FilteredPgLayer(layerReferences[0], request.query.gids.split(',')).export();
        }).then(function(path){
            response.download(path);
        })
    }

    csv(request, response, next) {

    }
}

module.exports = ExportController;