var config = require('../config.js');
var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;

var Promise = require('promise');

var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');

/**
 * Class representing adding features to vector layers
 */
class FeatureToVectorLayer {
    constructor (filter) {
        this._connection = conn.getMongoDb();

        this._mongoRefLayer = new FilteredMongoLayerReferences({
            location: Number(filter.location),
            year: Number(filter.period),
            areaTemplate: Number(filter.areaTemplate),
            isData: false
        }, this._connection);
    }

    addFeature (data){
        return this.getLayerId().then(function(layerId){
            console.log(layerId);
        });
    }

    /**
     * Get layer id from Mongo
     * @returns {Promise|*|Request|Promise.<T>}
     */
    getLayerId (){
        return this._mongoRefLayer.read().then(function(result){
            var id = result[0]._id;
            logger.info(`INFO FeatureToVectorLayer#getLayerId id: ` + id);
            return id;
        });
    }
}

module.exports = FeatureToVectorLayer;
