var config = require('../config.js');
var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;

var Promise = require('promise');

var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var PgPublicTable = require('../layers/PgPublicTable');

/**
 * Class representing adding features to vector layers
 */
class FeatureToVectorLayer {
    constructor (filter, pool) {
        this._connection = conn.getMongoDb();
        this._pgPool = pool;

        this._mongoRefLayer = new FilteredMongoLayerReferences({
            //location: Number(filter.currentLocation),
            //year: Number(filter.currentPeriod),
            areaTemplate: Number(filter.areaTemplate),
            isData: false
        }, this._connection);
    }

    /**
     * Add feature to vector layer
     * @param data {Object}
     * @returns {Promise.<T>}
     */
    addFeature (data){
        return this.getLayerInfo().then(this.addFeatureToTable.bind(this, data));
    }

    /**
     * Add feature to table in public view
     * @param data {Object}
     * @param layers {Array} list of layers
     */
    addFeatureToTable (data, layers) {
        this._pgPublicTable = new PgPublicTable(this._pgPool, layers.name);
        return this._pgPublicTable.insertRecord(data).then(function(res){
            console.log(layers);
            // todo update base layers
            // todo update views
            logger.info(`INFO FeatureToVectorLayer#insert : Record was inserted!`);
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR FeatureToVectorLayer#insert Error: `, err)
            )
        });
    }

    /**
     * Get layer id and name from Mongo
     * @returns {Promise|*|Request|Promise.<T>}
     */
    getLayerInfo (){
        return this._mongoRefLayer.json().then(function(result){
            var name = result[0].layer;

            logger.info(`INFO FeatureToVectorLayer#getLayerId name: ` + name);
            return {
                layers: result,
                name: name
            };
        });
    }
}

module.exports = FeatureToVectorLayer;
