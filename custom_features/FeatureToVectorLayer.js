var config = require('../config.js');
var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;

var Promise = require('promise');
var _ = require('underscore');

var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var PgBaseLayerTables = require('../layers/PgBaseLayerTables');
var PgLayerViews = require('../layers/PgLayerViews');
var PgSourceTable = require('../layers/PgSourceTable');

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

        this._baseLayerTables = new PgBaseLayerTables(this._pgPool);
        this._layerViews = new PgLayerViews(this._pgPool, "views");
    }

    /**
     * Add feature to vector layer
     * @param data {Object}
     * @returns {Promise.<T>}
     */
    addFeature (data){
        return this.getLayers().then(this.addFeatureToTable.bind(this, data));
    }

    /**
     * Add feature to table in public view
     * @param data {Object}
     * @param layers {Array} list of layers
     */
    addFeatureToTable (data, layers) {
        this._pgSourceTable = new PgSourceTable(this._pgPool, layers.name);

        var self = this;
        return this._pgSourceTable.insertRecord(data).then(function(res){
            logger.info(`INFO FeatureToVectorLayer#insert : Record was inserted!`);

            let promises = [];
            layers.ids.map(layerId => {
               promises.push(self.updateBaseLayer(layerId, `public.` + layers.name));
            });

            return Promise.all(promises).then(function(result){
                return result;
            });

        }).catch(err => {
            throw new Error(
                logger.error(`ERROR FeatureToVectorLayer#insert Error: `, err)
            )
        });
    }

    /**
     * Get layers from Mongo
     * @returns {Promise|*|Request|Promise.<T>}
     */
    getLayers (){
        return this._mongoRefLayer.json().then(this.getLayersInfo.bind(this));
    }

    /**
     *
     * @param layers {Array} list of records
     * @returns {{ids: Array, name: string}}
     */
    getLayersInfo (layers){
        var name = layers[0].layer.split(":")[1];
        var layersIDs = [];

        layers.map(layer => {
            layersIDs.push(layer._id);
        });

        logger.info(`INFO FeatureToVectorLayer#getLayerId name: ` + name);
        return {
            ids: layersIDs,
            name: name
        };
    }

    /**
     * It updates base layer table
     * @param layerReferenceId {number} ID of the base layer
     * @param sourceTableName {string} Name of the source table
     */
    updateBaseLayer (layerReferenceId, sourceTableName){
        logger.info(`INFO FeatureToVectorLayer#updateBaseLayer layerReferenceId: ` + layerReferenceId);
        logger.info(`INFO FeatureToVectorLayer#updateBaseLayer sourceTableName: ` + sourceTableName);

        var self = this;
        return this._baseLayerTables.updateCascade(layerReferenceId, 'fid', 'the_geom', sourceTableName).then(function(){
            return self._layerViews.addOnly(layerReferenceId);
        });
    }


}

module.exports = FeatureToVectorLayer;
