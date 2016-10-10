var conn = require('../common/conn');
var Promise = require('promise');
var FilteredBaseLayers = require('../layers/FilteredBaseLayers');
var MongoAttribute = require('../attributes/MongoAttribute');

var NumericAttribute = require('../attributes/NumericAttribute');
var TextAttribute = require('../attributes/TextAttribute');
var BooleanAttribute = require('../attributes/BooleanAttribute');

class Filter {
    constructor(request) {
        this._request = request;
    }

    filter() {
        return this.statisticAttributes(this._request);
    }

    statisticAttributes(request) {
        return this.dataViews(request).then(dataViews => {
            let attributes = {};

            dataViews.forEach(dataView => {
                this.dataView(dataView, attributes);
            });

            let attributesPromises = Object.keys(attributes)
                .filter(attribute => attribute != 'geometry')
                .map(attribute => {
                    var id = Number(attribute.split('_')[3]);
                    return new MongoAttribute(id, conn.getMongoDb()).json().then(jsonAttribute => {
                        jsonAttribute.values = attributes[attribute];
                        jsonAttribute.geometries = attributes['geometry'];
                        jsonAttribute.column = attribute;

                        if (jsonAttribute.type == 'numeric') {
                            return new NumericAttribute(jsonAttribute);
                        } else if (jsonAttribute.type == 'boolean') {
                            return new BooleanAttribute(jsonAttribute);
                        } else if (jsonAttribute.type == 'text') {
                            return new TextAttribute(jsonAttribute);
                        }
                    });
                });

            return Promise.all(attributesPromises);
        });
    }

    dataView(dataView, attributes) {
        dataView.rows.forEach(row => {
            Object.keys(row).forEach(key => {
                if (!attributes[key]) {
                    attributes[key] = [];
                }
                attributes[key].push(row[key]);
            })
        });
    }

    // TODO: Extract duplicity.
    dataViews(request) {
        var areaTemplate = Number(request.query.areaTemplate);
        var periods = request.query.periods.map(period => Number(period));
        var places = request.query.places.map(place => Number(place));
        return new FilteredBaseLayers({
            areaTemplate: areaTemplate,
            isData: false,
            year: {$in: periods},
            location: {$in: places}
        }, conn.getMongoDb()).read().then(baseLayers => {
            // Store the base layers as they will be needed later.
            baseLayers.forEach(baseLayer => baseLayer.queriedColumns = []);
            request.query.attributes
                .map(attribute => `as_${attribute.attributeSet}_attr_${attribute.attribute}`)
                .forEach(column => {
                    baseLayers
                        .filter(baseLayer => baseLayer.columns.indexOf(column) != -1)
                        .forEach(baseLayer => baseLayer.queriedColumns.push(column))
                });

            return Promise.all(baseLayers
                .map(baseLayer => `SELECT ${baseLayer.queriedColumns.join(',')}, ST_Transform(the_geom, 900913) as geometry FROM views.layer_${baseLayer._id}`)
                .map(sql => this._pgPool.pool().query(sql))
            );
        })
    }
}

module.exports = Filter;