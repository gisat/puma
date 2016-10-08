var Promise = require('promise');
var NormalDistribution = require('./NormalDistribution');

class Statistics {
    constructor(attributes) {
        this._attributes = attributes;
    }

    json() {
        var attributesPromises = [];

        this._attributes.forEach(attribute => {
            if(attribute.mongo.type == 'boolean') {
                attributesPromises.push(Promise.all([
                    Promise.resolve(attribute.mongo.type),
                    Promise.resolve(attribute.mongo._id),
                    Promise.resolve(attribute.attributeSet)
                ]))
            } else if(attribute.mongo.type == 'text') {
                attributesPromises.push(Promise.all([
                    Promise.resolve(attribute.mongo.type),
                    Promise.resolve(attribute.mongo._id),
                    Promise.resolve(attribute.attributeSet),
                    attribute.postgreSql.values()
                ]))
            } else {
                attributesPromises.push(Promise.all([
                    Promise.resolve(attribute.mongo.type),
                    Promise.resolve(attribute.mongo._id),
                    Promise.resolve(attribute.attributeSet),
                    attribute.postgreSql.min(),
                    attribute.postgreSql.max(),
                    new NormalDistribution(attribute.postgreSql).json()
                ]))
            }
        });

        return Promise.all(attributesPromises).then(attributes => {
            let jsonAttributes = [];

            attributes.forEach(attribute => {
                if(attribute[0] == 'boolean') {
                    jsonAttributes.push({
                        type: attribute[0],
                        attribute: attribute[1],
                        attributeSet: attribute[2],
                    });
                } else if(attribute[0] == 'text') {
                    jsonAttributes.push({
                        type: attribute[0],
                        attribute: attribute[1],
                        attributeSet: attribute[2],
                        values: attribute[3]
                    });
                } else {
                    jsonAttributes.push({
                        type: attribute[0],
                        attribute: attribute[1],
                        attributeSet: attribute[2],
                        min: attribute[3],
                        max: attribute[4],
                        distribution: attribute[5]
                    });
                }
            });

            return {
                attributes: jsonAttributes
            };
        });
    }
}

module.exports = Statistics;