var FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');

class FilteredBaseLayerReferences {
    constructor(filter, connection) {
        filter.isData = false;
        this._layerReferences = new FilteredMongoLayerReferences(filter, connection);
    }

    layerReferences() {
        return this._layerReferences.json();
    }
}

module.exports = FilteredBaseLayerReferences;
