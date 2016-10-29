var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
//var FilteredMongoLayerTemplate = require('../layers/FilteredMongoLayerTemplate');
var FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
var MongoLayerTemplate = require('../layers/MongoLayerTemplate');
//var FilteredMongoAttributes = require('../attributes/FilteredMongoAttributes');
var PgLayer = require('../layers/PgLayer');
//var MongoLocation = require('../metadata/MongoLocation');
var conn = require('../common/conn');
var Promise = require('promise');
var _ = require('lodash');
var superagent = require('superagent');

class TemplateData {
    constructor(template, place, pgPool) {
        this._template = template;
        this._place = place;
        this._pgPool = pgPool;
    }

    getTemplateData(pool) {
        console.log(`TemplateData #getTemplateData => template: ${this._template}, place: ${this._place}`);

        var tableColumns = [];
        var templateData = {};
        templateData.data = [];
        templateData.success = false;
        var featureData = {};
        featureData.attributeSets = [];

        var layer;
        var fidColumn;

        var self = this;

        var mongoLayerTemplate = new MongoLayerTemplate(self._template, conn.getMongoDb());
        return mongoLayerTemplate.json().then(templateObject => {
            var filteredMongoAttributeSets = new FilteredMongoAttributeSets({_id: {$in: templateObject.attributeSets}}, conn.getMongoDb());
            return filteredMongoAttributeSets.json()
        }).then(attributeSetsArray => {
            var promises = [];
            for (var attributeSet of attributeSetsArray) {
                var attributes = [];
                var attrpromises = [];
                for (var attribute of attributeSet.attributes) {
                    ((attribute, attributes) => {
                        var filteredMongoLayerReferences = new FilteredMongoLayerReferences({
                            areaTemplate: self._template,
                            location: self._place,
                            isData: true,
                            attributeSet: attributeSet._id,
                            columnMap: {
                                $elemMatch: {
                                    attribute: attribute
                                }
                            }
                        }, conn.getMongoDb()).json().then(filteredLayerrefsArray => {
                            //TODO: In ideal world year should be empty value
                            var filteredLayerref = _.find(filteredLayerrefsArray, {year: 2});
                            var columnMapAttribute;
                            if(filteredLayerref) {
                                layer = filteredLayerref.layer;
                                fidColumn = filteredLayerref.fidColumn;

                                columnMapAttribute = _.find(filteredLayerref.columnMap, {attribute: attribute});
                                tableColumns.push(columnMapAttribute.column);
                                attributes.push({
                                    _id: attribute,
                                    value: columnMapAttribute.column
                                });
                            } else {
                                var periods = [];
                                for (var ref of filteredLayerrefsArray) {
                                    if(ref.year != 2){
                                        columnMapAttribute = _.find(ref.columnMap, {attribute: attribute});
                                        tableColumns.push(columnMapAttribute.column);
                                        periods.push({
                                            _id: ref.year,
                                            value: columnMapAttribute.column
                                        });
                                    }
                                }
                                attributes.push({
                                    _id: attribute,
                                    periods: periods
                                });
                            }
                        });
                        attrpromises.push(filteredMongoLayerReferences);
                    })(attribute, attributes);
                }
                var attsetpromise = Promise.all(attrpromises);
                promises.push(attsetpromise);
                ((attributeSet, attributes) => {
                    attsetpromise.then(() => {
                        featureData.attributeSets.push({
                            _id: attributeSet._id,
                            attributes: attributes
                        });
                    });
                })(attributeSet, attributes);
            }
            return Promise.all(promises);
        }).then(() => {
            tableColumns.push(fidColumn);
            tableColumns.push('lat');
            tableColumns.push('lon');
            if(!layer || !fidColumn){
                templateData.success = false;
                templateData.message = `TemplateData #getTemplateData => Undefined => layer: ${layer}, fidColumn: ${fidColumn}`;
                return templateData;
            }
            var pgLayer = new PgLayer(layer, fidColumn, null, self._pgPool);
            return pgLayer.tableData(tableColumns).then(result => {
                for (var row of result.rows) {
                    templateData.data.push({
                        _id: row[fidColumn],
                        geometry: {
                            latitude: row.lat,
                            longitude: row.lon
                        },
                        attributeSets: self.updateCollection(featureData.attributeSets, row)
                    });
                    // TODO Has to be removed!!!!
                    // if(row[fidColumn] >= 100){
                    //     break;
                    // }
                }
                templateData.success = true;
                return templateData;
            });
        });
    }

    updateCollection(collection, row) {
        var updatedCollection = _.cloneDeep(collection);
        for(var attributeSet of updatedCollection) {
            for(var attribute of attributeSet.attributes) {
                if(attribute.hasOwnProperty('value')){
                    attribute.value = row[attribute.value];
                }
                if(attribute.hasOwnProperty('periods')){
                    for(var period of attribute.periods){
                        if(period.hasOwnProperty('value')){
                            period.value = row[period.value];
                        }
                    }
                }
            }
        }
        return updatedCollection;
    }
}

module.exports = TemplateData;