var _ = require('underscore');

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

    filter(options) {
        var alreadyInserted = [];

        return this._jsonAttribute.values.map((value, index) => {
            var attributeName = `at_${this._jsonAttribute.areaTemplates[index]}_loc_${this._jsonAttribute.locations[index]}_gid_${this._jsonAttribute.gids[index]}`;
            if(value == options.value && alreadyInserted.indexOf(attributeName) == -1) {
                alreadyInserted.push(attributeName);
                return {
                    loc: this._jsonAttribute.locations[index],
                    at: this._jsonAttribute.areaTemplates[index],
                    gid: this._jsonAttribute.gids[index],
                    geom: this._jsonAttribute.geometries[index]
                }
            }
        }).filter(value => value);
    }

    json(options) {
        return {
            attribute: this._attribute,
            attributeSet: this._attributeSet,
            attributeName: options.attributeName,
            attributeSetName: options.attributeSetName,
            values: _.uniq(this._values),
            type: 'text'
        }
    }
}


module.exports = TextAttribute;