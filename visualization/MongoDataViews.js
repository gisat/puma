const MongoDataView = require('./MongoDataView');
const FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
const FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
const conn = require(`../common/conn`);
const logger = require('../common/Logger').applicationWideLogger;

class MongoDataViews {
    constructor(connection) {
        this._connection = connection;
    }
    
    remove(visualization) {
        var self = this;
        return visualization.id().then(function (id) {
            var collection = self._connection.collection(MongoDataView.collectionName());
            return collection.removeOne({_id: id});
        });
    }
    
    add(dataView) {
        let collection = this._connection.collection(MongoDataView.collectionName());
        return collection.insert(dataView);
    }

    update(id, data) {
		let collection = this._connection.collection(MongoDataView.collectionName());
		return collection.update({_id: id}, {$set: data});
    }

    /**
     * TODO: Clean
     * Create default view, which allows user to get to the Scope with the default configuration for the given combination
     * of place, scope and year. The top level place is expanded.
     * @param scope {Number} Id of the scope used for the deep linking.
     * @param theme {Number} Id of the theme used for the deep linking.
     * @param location {Number} Id of the place used for the deep linking.
     * @param period {Number} Id of the period used for the deep linking.
     * @param analyticalUnits {PgAnalyticalUnits} Service for accessing analytical units.
     * @returns {*}
     */
        defaultForScope(scope, theme, location, period, analyticalUnits) {
        let collection = this._connection.collection(MongoDataView.collectionName());
        let id = conn.getNextId();
        let analyticalUnitLevel = null;

        return new FilteredMongoScopes({_id: Number(scope)}, this._connection).json().then(scopes => {
            logger.info(`MongoDataViews#defaultForScope Scopes: ${scopes.length}`, scopes);
            if(scopes.length === 0) {
                logger.error('MongoDataViews#defaultForScope Nonexistent scope.');
                throw new Error('Nonexistent scope');
            }

            if(!scopes[0].featureLayers || !scopes[0].featureLayers.length) {
                logger.error('MongoDataViews#defaultForScope Nonexistent area templates.');
                throw new Error(`The scope doesn't have any associated analytical unit level. `);
            }

            analyticalUnitLevel = scopes[0].featureLayers[0];
            return new FilteredMongoLayerReferences({
                location: location,
                year: period,
                areaTemplate: analyticalUnitLevel,
                isData: false
            }, this._connection).json();
        }).then(layerReferences => {
            logger.info(`MongoDataViews#defaultForScope LayerReferences: ${layerReferences.length}`, layerReferences);
            if(layerReferences.length === 0) {
                logger.error(`MongoDataViews#defaultForScope Nonexistent base layer for analyticalUnitLevel: ${analyticalUnitLevel} Location: ${location}, Year: ${year}.`);
                throw new Error('There is no mapped data layer for the top analytical unit level.');
            }

            if(layerReferences.length > 1) {
                logger.warn(`MongoDataViews#defaultForScope More than one mapping for analyticalUnitLevel: ${analyticalUnitLevel} Location: ${location}, Year: ${year}`);
            }

            return analyticalUnits.filtered(layerReferences[0]._id, {limit: 1});
        }).then(analyticalUnits => {
            logger.info(`MongoDataViews#defaultForScope LayerReferences: ${analyticalUnits.length}`, analyticalUnits);
            if(analyticalUnits.length === 0) {
                logger.error(`MongoDataViews#defaultForScope Base layer doesn't contain any unit for analyticalUnitLevel: ${analyticalUnitLevel} Location: ${location}, Year: ${year}`);
                throw new Error(`Base layer doesn't contain any unit for analyticalUnitLevel: ${analyticalUnitLevel} Location: ${location}, Year: ${year}`);
            }

            return collection.insert({
                "_id": id,
                "name": "",
                "conf": {
                    "multipleMaps": false,
                    "years": [
                        period
                    ],
                    "expanded": {
                        location: {
                            analyticalUnitLevel: [analyticalUnits[0].gid]
                        }
                    },
                    "dataset": scope,
                    "theme": theme,
                    "location": location,
                    "is3D": true,
                    "name": "Initial",
                    "description": "",
                    "language": "en",
                    "locations": location ? [location] : [],
                    "selMap": {},
                    "choroplethCfg": [],
                    "pagingUseSelected": false,
                    "filterMap": {},
                    "filterActive": false,
                    "layers": [],
                    "page": 1,
                    "selection": [],
                    "cfgs": []
                }
            });
        }).then(() => {
            return id;
        });
    }
}

module.exports = MongoDataViews;