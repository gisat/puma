const _ = require('lodash');

const FilteredBaseLayerReferences = require('../../layers/FilteredBaseLayerReferences');
const MongoLayerReference = require('../../layers/MongoLayerReference');
const MongoLayerReferences = require('../../layers/MongoLayerReferences');
const MongoPlaces = require('../../metadata/MongoLocations');
const MongoScope = require('../../metadata/MongoScope');
const PgBaseLayerTables = require('../../layers/PgBaseLayerTables');
const PgLayerViews = require('../../layers/PgLayerViews');

class Places {
    constructor(pgPool, connection) {
        this._places = new MongoPlaces(connection);
        this._baseLayers = new PgBaseLayerTables(pgPool);
        this._layersViews = new PgLayerViews(pgPool, null, null);
        this._layerReferences = new MongoLayerReferences(connection);

        this._connection = connection;
    }

    /**
     * Create new Place with associated structures in all relevant data stores. Place in mongo is created, Relevant layerrefs are
     * created and the base layer is created in the PostgreSQL database
     * @param id {Number} Id of the place
     * @param scopeId {Number} Id of the Scope to which the place is added
     * @param name {String} Name of the place to be displayed
     * @param bbox {String} Bounding Box for the place.
     * @param analyticalLevelTables {[]} Array of ids of analytical units with associated table names.
     */
    async create(id, scopeId, name, bbox, analyticalLevelTables) {
        // Create new Place.
        const placeId = id;
        await this._places.add({
            _id: placeId,
            name: name,
            dataset: scopeId,
            bbox: bbox,
            active: true
        });

        const scope = await new MongoScope(scopeId, this._connection).json();
        const layerReferences = _.flatten(analyticalLevelTables.map((au,index) => {
            const referencesPerPeriod = [];
            scope.years.forEach(period => {
                referencesPerPeriod.push({
                    _id: ++id,
                    isData: false,
                    fidColumn: `AL${index+1}_ID`,
                    areaTemplate: scope.featureLayers[index],
                    location: placeId,
                    year: period,
                    layer: au
                })
            });

            return referencesPerPeriod
        }));

        // Create MongoLayerReferences.
        await this._connection.collection('layerref').insertMany(layerReferences);

        return Promise.all(layerReferences.map(layerReference => {
            return this._baseLayers.add(layerReference._id, layerReference.fidColumn, 'the_geom', layerReference.layer.split(':')[1]);
        }));
    }

    async addAttributes(layerRefs, placeId) {
        const createAllViews = [];

        const referencesByPeriod = _.groupBy(layerRefs, 'year');
        Object.keys(referencesByPeriod).forEach(period => {
            const referencesByAreaTemplate = _.groupBy(referencesByPeriod[period], 'areaTemplate');
            Object.keys(referencesByAreaTemplate).forEach(areaTemplate => {
                createAllViews.push(new FilteredBaseLayerReferences({
                    // location
                    location: Number(placeId),
                    areaTemplate: Number(areaTemplate),
                    year: Number(period)
                }, this._connection).layerReferences().then(baseLayerReferences => {
                    const relevantLayerRefs = layerRefs.filter(layerRef => {
                        return layerRef.areaTemplate == areaTemplate && layerRef.year == period && layerRef.location == placeId;
                    });
                    return this._layersViews.add(new MongoLayerReference(baseLayerReferences[0]._id, this._connection), relevantLayerRefs.map(layerRef => new MongoLayerReference(layerRef._id, this._connection)));
                }));
            })
        });

        return Promise.all(createAllViews);
    }
}

module.exports = Places;