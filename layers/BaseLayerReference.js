var FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');

class BaseLayerReference {
    constructor(id) {
        this._id = id;
    }

    columns() {

    }
}

module.exports = BaseLayerReference;
