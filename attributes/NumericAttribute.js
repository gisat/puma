var _ = require('underscore');

class NumericAttribute {
    constructor(jsonAttribute) {
        let min = jsonAttribute.values[0];
        let max = jsonAttribute.values[0];

        jsonAttribute.values = jsonAttribute.values.map(value => Number(value));
        jsonAttribute.values.forEach(value => {
            min = Math.min(min, value);
            max = Math.max(max, value);
        });

        this._min = min;
        this._max = max;
        this._values = jsonAttribute.values;

        this._attribute = jsonAttribute._id;
        this._attributeSet = Number(jsonAttribute.column.split('_')[1]);

        this._jsonAttribute = jsonAttribute;
    }

    name() {
        return this._jsonAttribute.column;
    }

    filter(options) {
        var alreadyInserted = [];

        return this._jsonAttribute.values.map((value, index) => {
            var attributeName = `at_${this._jsonAttribute.areaTemplates[index]}_loc_${this._jsonAttribute.locations[index]}_gid_${this._jsonAttribute.gids[index]}`;
            if(value > options.value[0] && value < options.value[1] && alreadyInserted.indexOf(attributeName) == -1) {
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
        let classes = options.classes;
        let distribution = Array(classes).fill(0);
        let classSize = (this._max - this._min) / classes;

        this._values.forEach(value => {
            if(Math.floor((value - this._min) / classSize) == classes) {
                distribution[classes - 1]++;
            } else {
                distribution[Math.floor((value - this._min) / classSize)]++;
            }
        });

        return {
            attribute: this._attribute,
            attributeSet: this._attributeSet,
            min: this._min,
            max: this._max,
            type: 'numeric',
            distribution: distribution
        }
    }
}

module.exports = NumericAttribute;