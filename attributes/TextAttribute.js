var _ = require('underscore');
var UUID = require('../common/UUID');
var moment = require('moment');
var logger = require('../common/Logger').applicationWideLogger;

class TextAttribute {
    constructor(jsonAttribute) {
        this._attribute = jsonAttribute._id;
        this._attributeSet = jsonAttribute.column.split('_')[1];
        this._values = jsonAttribute.values;

        this._jsonAttribute = jsonAttribute;
    }

    name() {
        return this._jsonAttribute.column;
    }

    info(options) {
        var alreadyInserted = [];

        return this._jsonAttribute.values.map((value, index) => {
            var attributeName = `at_${this._jsonAttribute.areaTemplates[index]}_loc_${this._jsonAttribute.locations[index]}_gid_${this._jsonAttribute.gids[index]}`;
            if(alreadyInserted.indexOf(attributeName) == -1) {
                alreadyInserted.push(attributeName);
                return {
                    gid: this._jsonAttribute.gids[index],
                    name: this._jsonAttribute.names[index],
                    geom: this._jsonAttribute.geometries[index],
                    attributeName: options.attributeName,
                    attributeSetName: options.attributeSetName,
                    value: value
                }
            }
        }).filter(value => value);
    }

    filter(options) {
        var uuid = new UUID().toString();
        var alreadyInserted = [];

        logger.info(`TextAttribute#filter UUID ${uuid} Start: ${moment().format()}`);

        var result =  this._jsonAttribute.values.map((value, index) => {
            var attributeName = `at_${this._jsonAttribute.areaTemplates[index]}_loc_${this._jsonAttribute.locations[index]}_gid_${this._jsonAttribute.gids[index]}`;
            if((value == options.value || options.value == "" || options.value.indexOf(String(value)) != -1) && alreadyInserted.indexOf(attributeName) == -1) {
                alreadyInserted.push(attributeName);
                return {
                    loc: this._jsonAttribute.locations[index],
                    at: this._jsonAttribute.areaTemplates[index],
                    gid: this._jsonAttribute.gids[index],
                    geom: this._jsonAttribute.geometries[index]
                }
            }
        }).filter(value => value);

        logger.info(`TextAttribute#filter UUID ${uuid} End: ${moment().format()}`);

        return result;
    }

    json(options) {
        return {
            attribute: this._attribute,
            attributeSet: this._attributeSet,
            attributeName: options.attributeName,
            attributeSetName: options.attributeSetName,
            units: options.units,
            standardUnits: options.standardUnits,
            active: options.active,
            values: _.uniq(this._values),
            type: 'text'
        }
    }
}


module.exports = TextAttribute;