var Promise = require('promise');

class JsonMongoAttribute {
    constructor(attribute) {
        this._attribute = attribute;
    }

    layerReferences() {
        return this._attribute.layerReferences().then(layerReferences => {
            var promises = [];

            layerReferences.forEach(reference => {
                promises.push(reference.json())
            });

            return Promise.all(promises);
        })
    }

    json() {
        return this._attribute.json();
    }
}

module.exports = JsonMongoAttribute;