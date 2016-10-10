var FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');
var Promise = require('promise');

class FilteredBaseLayers {
    constructor(filter, connection) {
        this._filter = filter;
        this._connection = connection;

        this._collection = new FilteredMongoLayerReferences(filter, connection);
    }

    read() {
        return this._collection
            .json()
            .then(baseLayers => {
                return Promise.all(baseLayers.map(this.addColumnsToBaseLayer.bind(this)));
            })
    }

    addColumnsToBaseLayer(baseLayer) {
        return this.dataLayers(baseLayer)
            .then(this.addColumns.bind(this, baseLayer));
    }

    dataLayers(baseLayer) {
        return new FilteredMongoLayerReferences({
            isData: true,
            areaTemplate: baseLayer.areaTemplate,
            location: baseLayer.location,
            year: baseLayer.year
        }, this._connection)
            .json();
    }

    addColumns(baseLayer, dataLayers) {
        dataLayers.forEach(dataLayer => {
            baseLayer.columns = dataLayer.columnMap.map(column => {
                return `as_${dataLayer.attributeSet}_attr_${column.attribute}`;
            });
        });

        return baseLayer;
    }
}

module.exports = FilteredBaseLayers;