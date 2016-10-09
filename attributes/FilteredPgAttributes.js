var Promise = require('promise');
var _ = require('underscore');

class FilteredPgAttributes {
    constructor(attributes) {
        this._attributes = attributes;
    }

    json() {
        var attributes = [];

        this._attributes.forEach(attribute => {
            attributes.push(
                attribute.postgreSql.filtered(attribute.source.value, attribute.areaTemplate, attribute.location)
            )
        });

        return Promise.all(attributes).then(arrays => {
            var amountOfTimes = arrays.length;
            var map = {};
            _.flatten(arrays).forEach(element => {
                if(!map[`at_${element.at}_gid_${element.gid}_loc_${element.loc}`]) {
                    map[`at_${element.at}_gid_${element.gid}_loc_${element.loc}`] = {value: 0, element: element};
                }
                map[`at_${element.at}_gid_${element.gid}_loc_${element.loc}`].value++;
            });

            return _.compact(
                Object.keys(map).map(key => {
                    return map[key].value == amountOfTimes ? map[key].element : null;
                })
            );
        })
    }
}

module.exports = FilteredPgAttributes;