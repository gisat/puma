class NormalDistribution {
    constructor(attribute, classes) {
        this._attribute = attribute;
        this._classes = classes;
    }

    json() {
        var min, max;
        return this._attribute.min().then(pMin => {
            min = pMin;
            return this._attribute.max();
        }).then(pMax => {
            max = pMax;
            return this._attribute.values();
        }).then(values => {
            let distribution = Array(this._classes).fill(0);
            let classSize = (max - min) / this._classes;

            values.forEach(value => {
                if(Math.floor((value - min) / classSize) == this._classes) {
                    distribution[this._classes - 1]++;
                } else {
                    distribution[Math.floor((value - min) / classSize)]++;
                }
            });

            return distribution;
        })
    }
}

module.exports = NormalDistribution;