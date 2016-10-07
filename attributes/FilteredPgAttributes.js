var Promise = require('promise');

class FilteredPgAttributes {
    constructor(attributes) {
        this._attributes = attributes;
    }

    json() {
        var attributes = [];

        this._attributes.forEach(attribute => {
            attributes.push(attribute.postgreSql.filtered(attribute.source.value, attribute.areaTemplate, attribute.location))
        });

        return Promise.all(attributes).then(arrays => {
            return [].concat(arrays);
        })
    }
}

module.exports = FilteredPgAttributes;