var FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');

class BaseLayerReference {
    constructor(layerReference, connection) {
        this._layerReferences = new FilteredMongoLayerReferences({
            year: layerReference.year,
            location: layerReference.location,
            areaTemplate: layerReference.areaTemplate,
            isData: false
        }, connection);
    }

    layerReferences() {
        return this._layerReferences.json();
    }
}

module.exports = BaseLayerReference;
