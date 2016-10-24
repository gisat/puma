var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
//var FilteredMongoLayerTemplate = require('../layers/FilteredMongoLayerTemplate');
//var FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
//var MongoLayerTemplate = require('../layers/MongoLayerTemplate');
//var FilteredMongoAttributes = require('../attributes/FilteredMongoAttributes');
var PgLayer = require('../layers/PgLayer');
//var MongoLocation = require('../metadata/MongoLocation');
var conn = require('../common/conn');
var Promise = require('promise');

class TemplateData {
    constructor(template, place, pgPool) {
        this._template = template;
        this._place = place;
        this._pgPool = pgPool;
        this._templateData = {};
    }

    getTemplateData(pool) {

        var self = this;
        this._templateData.features = [];

        return new Promise(function (fulfill, reject) {
            console.log(`TemplateData #getTemplateData => template: ${self._template}, place: ${self._place}`);

            new FilteredMongoLayerReferences({areaTemplate: self._template, location: self._place, isData: true}, conn.getMongoDb()).json().then(result => {
                fulfill(result);
            });

            /*
             var pgLayer = new PgLayer(data.layerName, data.fid, "au", self._pgPool);
             pgLayer.tableData([data.fid, 'LAT', 'LON']).then(result => {
             for (var row of result.rows) {
             self._templateData.features.push({
             _id: row[data.fid],
             geometry: {
             latitude: row.lat,
             longitude: row.lon
             }
             });
             //TODO: Remove to get all features
             break;
             }
             fulfill({data: self._templateData, success: true});
             });
             */

        });
    }
}

module.exports = TemplateData;