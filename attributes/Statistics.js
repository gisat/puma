var Promise = require('promise');
var NormalDistribution = require('./NormalDistribution');

class Statistics {
    constructor(attributes, classes) {
        this._attributes = attributes;
        this._classes = classes;
    }

    json() {
        var attributesPromises = [];

        this._attributes.forEach(attribute => {
            if(attribute.mongo.type == 'boolean') {
                attributesPromises.push(Promise.all([
                    Promise.resolve(attribute.mongo.type),
                    Promise.resolve(attribute.mongo._id),
                    Promise.resolve(attribute.attributeSet),
                    Promise.resolve(attribute.source.attributeName),
                    Promise.resolve(attribute.source.attributeSetName)
                ]))
            } else if(attribute.mongo.type == 'text') {
                attributesPromises.push(Promise.all([
                    Promise.resolve(attribute.mongo.type),
                    Promise.resolve(attribute.mongo._id),
                    Promise.resolve(attribute.attributeSet),
                    Promise.resolve(attribute.source.attributeName),
                    Promise.resolve(attribute.source.attributeSetName),
                    attribute.postgreSql.values()
                ]))
            } else {
                attributesPromises.push(Promise.all([
                    Promise.resolve(attribute.mongo.type),
                    Promise.resolve(attribute.mongo._id),
                    Promise.resolve(attribute.attributeSet),
                    Promise.resolve(attribute.source.attributeName),
                    Promise.resolve(attribute.source.attributeSetName),
                    attribute.postgreSql.min(),
                    attribute.postgreSql.max(),
                    new NormalDistribution(attribute.postgreSql, this._classes).json()
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
                        attributeName: attribute[3],
                        attributeSetName: attribute[4]
                    });
                } else if(attribute[0] == 'text') {
                    jsonAttributes.push({
                        type: attribute[0],
                        attribute: attribute[1],
                        attributeSet: attribute[2],
                        attributeName: attribute[3],
                        attributeSetName: attribute[4],
                        values: attribute[5]
                    });
                } else {
                    jsonAttributes.push({
                        type: attribute[0],
                        attribute: attribute[1],
                        attributeSet: attribute[2],
                        attributeName: attribute[3],
                        attributeSetName: attribute[4],
                        min: attribute[5],
                        max: attribute[6],
                        distribution: attribute[7]
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