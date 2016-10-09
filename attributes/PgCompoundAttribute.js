var _ = require('underscore');
var Promise = require('promise');

class PgCompoundAttribute {
    constructor(attributes, type) {
        this._attributes = attributes;
        this._type = type;
    }

    min() {
        var promises = [];
        this._attributes.forEach(attribute=> {
            promises.push(
                attribute.min()
            );
        });
        
        return Promise.all(promises).then(mins => {
            mins = _.flatten(mins);
            let min = mins[0];

            mins.forEach(minimum=> {
                min = Math.min(min, minimum);
            });

            return min;
        })
    }

    max() {
        var promises = [];
        this._attributes.forEach(attribute=> {
            promises.push(
                attribute.max()
            );
        });

        return Promise.all(promises).then(maxs => {
            maxs = _.flatten(maxs);
            let max = maxs[0];

            maxs.forEach(maximum=> {
                max = Math.max(max, maximum);
            });

            return max;
        })
    }

    values() {
        var promises = [];
        this._attributes.forEach(attribute=> {
            promises.push(
                attribute.values()
            );
        });

        return Promise.all(promises).then(values => {
            if(this._type == 'text') {
                return _.uniq(_.flatten(values));
            } else {
                return _.flatten(values);
            }
        })
    }
}

module.exports = PgCompoundAttribute;