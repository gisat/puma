var Promise = require('promise');
var _ = require('underscore');
var moment = require('moment');
var UUID = require('../common/UUID');
var logger = require('../common/Logger').applicationWideLogger;

class FilteredPgAttributes {
    constructor(attributes) {
        this._attributes = attributes;
    }

    json() {
        var attributes = [];

        this._attributes.forEach(attribute => {
            var uuid = new UUID().toString();
            logger.info(`FilteredPgAttributes#json UUID: ${uuid} Start: ${moment().format()}`);
            attributes.push(
                attribute.postgreSql.filtered(attribute.source.value, attribute.areaTemplate, attribute.location).then((array) => {
                    logger.info(`FilteredPgAttributes#json UUID: ${uuid} End: ${moment().format()}`);
                    return array;
                })
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