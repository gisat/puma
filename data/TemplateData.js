let FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
//let FilteredMongoLayerTemplate = require('../layers/FilteredMongoLayerTemplate');
let FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
let MongoLayerTemplate = require('../layers/MongoLayerTemplate');
//let FilteredMongoAttributes = require('../attributes/FilteredMongoAttributes');
let PgLayer = require('../layers/PgLayer');
//let MongoLocation = require('../metadata/MongoLocation');
let conn = require('../common/conn');
let Promise = require('promise');
let _ = require('lodash');
let superagent = require('superagent');

class TemplateData {
    constructor(template, place, pgPool) {
        this._template = template;
        this._place = place;
        this._pgPool = pgPool;
    }

    getTemplateData(pool) {
        console.log(`TemplateData #getTemplateData => template: ${this._template}, place: ${this._place}`);

        let tableColumns = [];
        let templateData = {};
        templateData.data = [];
        templateData.success = false;
        let featureData = {};
        featureData.attributeSets = [];

        let layer;
        let fidColumn;

        let self = this;

        return new FilteredMongoLayerReferences({
            areaTemplate: self._template,
            location: self._place,
            isData: false,
            active: true
        }, conn.getMongoDb()).json().then(baseLayerRefs => {
            if(!baseLayerRefs.length) {
                templateData.success = true;
                return templateData;
            } else if (baseLayerRefs.length != 1) {
                return Promise.reject(`TemplateData #getTemplateData Multiple active layerrefs found`);
            }

            layer = baseLayerRefs[0].layer;
            fidColumn = baseLayerRefs[0].fidColumn;

            return new MongoLayerTemplate(self._template, conn.getMongoDb()).json().then(templateObject => {
                let filteredMongoAttributeSets = new FilteredMongoAttributeSets({_id: {$in: templateObject.attributeSets || []}}, conn.getMongoDb());
                return filteredMongoAttributeSets.json();
            }).then(attributeSetsArray => {
                let promises = [];
                for (let attributeSet of attributeSetsArray) {
                    let attributes = [];
                    let attrpromises = [];
                    for (let attribute of attributeSet.attributes) {
                        ((attribute, attributes) => {
                            let filteredMongoLayerReferences = new FilteredMongoLayerReferences({
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
                                let filteredLayerref = _.find(filteredLayerrefsArray, {year: null});
                                let columnMapAttribute;
                                if (filteredLayerref) {
                                    columnMapAttribute = _.find(filteredLayerref.columnMap, {attribute: attribute});
                                    tableColumns.push(columnMapAttribute.column);
                                    attributes.push({
                                        attributeKey: attribute,
                                        value: columnMapAttribute.column
                                    });
                                } else {
                                    let periods = [];
                                    for (let ref of filteredLayerrefsArray) {
                                        if (ref.year) {
                                            columnMapAttribute = _.find(ref.columnMap, {attribute: attribute});
                                            tableColumns.push(columnMapAttribute.column);
                                            periods.push({
                                                periodKey: ref.year,
                                                value: columnMapAttribute.column
                                            });
                                        }
                                    }
                                    attributes.push({
                                        attributeKey: attribute,
                                        periods: periods
                                    });
                                }
                            });
                            attrpromises.push(filteredMongoLayerReferences);
                        })(attribute, attributes);
                    }
                    let attsetpromise = Promise.all(attrpromises);
                    promises.push(attsetpromise);
                    ((attributeSet, attributes) => {
                        attsetpromise.then(() => {
                            featureData.attributeSets.push({
                                attributeSetKey: attributeSet._id,
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
                if (!layer || !fidColumn) {
                    templateData.success = false;
                    templateData.message = `TemplateData #getTemplateData => Undefined => layer: ${layer}, fidColumn: ${fidColumn}`;
                    return templateData;
                }
                let pgLayer = new PgLayer(layer, fidColumn, null, self._pgPool);
                return pgLayer.tableData(tableColumns).then(result => {
                    for (let row of result.rows) {
                        templateData.data.push({
                            key: row[fidColumn],
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
        }).catch(error => {
            templateData.success = false;
            templateData.message = error;
            return templateData;
        });
    }

    updateCollection(collection, row) {
        let updatedCollection = _.cloneDeep(collection);
        for (let attributeSet of updatedCollection) {
            for (let attribute of attributeSet.attributes) {
                if (attribute.hasOwnProperty('value')) {
                    attribute.value = row[attribute.value];
                }
                if (attribute.hasOwnProperty('periods')) {
                    for (let period of attribute.periods) {
                        if (period.hasOwnProperty('value')) {
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