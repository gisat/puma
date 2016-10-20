var conn = require('../common/conn');
var Promise = require('promise');
var _ = require('underscore');
var logger = require('../common/Logger').applicationWideLogger;

var FilteredBaseLayers = require('../layers/FilteredBaseLayers');
var MongoAttribute = require('../attributes/MongoAttribute');

var NumericAttribute = require('../attributes/NumericAttribute');
var TextAttribute = require('../attributes/TextAttribute');
var BooleanAttribute = require('../attributes/BooleanAttribute');

class Filter {
    constructor(request, pgPool) {
        this._request = request;
        this._pgPool = pgPool;

        this._mongoAttributes = {};
    }

    statistics() {
        return this.statisticAttributes(this._request);
    }

    statisticAttributes(request) {
        return Promise.all(request.query.attributes.map(attribute => {
            return new MongoAttribute(Number(attribute.attribute), conn.getMongoDb()).json();
        })).then(attributes => {
            attributes.forEach(attribute => {
                this._mongoAttributes[attribute._id] = attribute;
            });

            return this.dataViews(request);
        }).then(dataViews => {
            let attributes = {};

            dataViews.forEach(dataView => {
                this.dataView(dataView, attributes);
            });

            let attributesPromises = Object.keys(attributes)
                .filter(attribute => attribute != 'geometry' && attribute != 'gid' && attribute != 'location' && attribute != 'areatemplate')
                .map(attribute => {
                    var id = Number(attribute.split('_')[3]);
                    let jsonAttribute = this._mongoAttributes[id];

                    jsonAttribute.values = attributes[attribute];
                    jsonAttribute.geometries = attributes['geometry'];
                    jsonAttribute.gids = attributes['gid'];
                    jsonAttribute.areaTemplates = attributes['areatemplate'].map(base => Number(base));
                    jsonAttribute.locations = attributes['location'].map(base => Number(base));
                    jsonAttribute.column = attribute;

                    if (jsonAttribute.type == 'numeric') {
                        return new NumericAttribute(jsonAttribute);
                    } else if (jsonAttribute.type == 'boolean') {
                        return new BooleanAttribute(jsonAttribute);
                    } else if (jsonAttribute.type == 'text') {
                        return new TextAttribute(jsonAttribute);
                    }
                });

            return Promise.all(attributesPromises);
        });
    }

    dataView(dataView, attributes) {
        if(!dataView || !dataView.rows) {
            return;
        }

        dataView.rows.forEach(row => {
            Object.keys(row).forEach(key => {
                if (!attributes[key]) {
                    attributes[key] = [];
                }
                attributes[key].push(row[key]);
            })
        });
    }

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
                .map(baseLayer => `SELECT ${baseLayer.queriedColumns.join(',')}, 
                        ST_AsText(ST_Transform(the_geom, 900913)) as geometry, gid, '${baseLayer.location}' as location, '${baseLayer.areaTemplate}' as areaTemplate FROM views.layer_${baseLayer._id} WHERE 
                        ${this.generateWhere(baseLayer.queriedColumns).join(' AND ')}`)
                .map(sql => {
                    logger.info('Filter#dataViews Sql', sql);
                    return this._pgPool.pool().query(sql)
                })
            );
        })
    }

    generateWhere(columns) {
        return columns.map(column => {
            var id = Number(column.split('_')[3]);
            var attributeSetId = Number(column.split('_')[1]);
            var filteringValue = this._request.query.attributes.filter(attribute => Number(attribute.attribute) == id && Number(attribute.attributeSet) == attributeSetId)[0].value;
            debugger;
            if(this._mongoAttributes[id].type == 'numeric') {
                return `${column} >= ${filteringValue[0]} AND ${column} <= ${filteringValue[1]}`;
            }
            else if (this._mongoAttributes[id].type == 'text' && filteringValue.length == 0) {
                return `${column} IS NOT NULL`;
            }
            else if (this._mongoAttributes[id].type == 'boolean' && filteringValue == "true") {
                return `${column}='t'`;
            }
            else if (this._mongoAttributes[id].type == 'boolean' && filteringValue == "false") {
                return `${column}='f'`;
            }
            else {
                return `${column}='${filteringValue}'`;
            }
        })
    }
}

module.exports = Filter;