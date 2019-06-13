const _ = require('lodash');
const fs = require('fs');

const MongoScope = require('../../metadata/MongoScope');
const MongoTopic = require('../../metadata/MongoTopic');
const FilteredMongoPeriods = require('../../metadata/FilteredMongoPeriods');

class MetadataForIntegration {
    /**
     *
     * @param mongo
     * @param scope Id of the scope.
     * @param bucket {S3Bucket} Bucket for storing the files.
     */
    constructor(mongo, scope, bucket) {
        this._mongo = mongo;
        this._scope = new MongoScope(scope, this._mongo);
        this._storage = bucket;
    }

    async metadata(place, uuid, lulcUrl) {
        const themesForScope = await this._scope.themes();
        let topics = await this.loadTopics(themesForScope);
        topics = _.flatten(topics);
        topics = _.uniqBy(topics, '_id');
        const scope = {
            themes: [],
            place: place
        };
        const scopeJson =  await this._scope.json();
        scope.periods = await new FilteredMongoPeriods({_id: {$in: scopeJson.years}}, this._mongo).json();
        scope.periods = scope.periods.map(period => {
            return {
                id: period._id,
                periods: period.name != "2016" ? ["2002", "2003", "2004", "2005", "2006", "2007", "2008"]: ["2015", "2016", "2017", "2018"]
            }
        });

        scope.uuid = uuid;
        scope.url = lulcUrl;

        scope.analyticalUnitLevels = scopeJson.featureLayers.map((layer, index) => {
            return {
                id: layer,
                template: 'EO4SD_\.*_AL' + (index + 1) + '\.*'
            }
        }); // These are enough. AL1, AL2, AL3

        // Finalize Periods and Layer Templates.

        return Promise.all(topics.map(topic => {
            let themeTopic;
            return topic.json().then(pTopic => {
                themeTopic = {
                    id: pTopic._id,
                    layerTemplates: pTopic.layerTemplates,
                    integrationType: pTopic.integrationType,
                    filteringAttribute: pTopic.filteringAttribute
                };
                scope.themes.push(themeTopic);
                if(themeTopic.layerTemplates) {
                    themeTopic.layerTemplates = themeTopic.layerTemplates.map(layerTemplate => {
                        return {
                            id: layerTemplate.id,
                            layerNameTemplate: layerTemplate.layerNameTemplate.replace(/\./g, '\.*')
                        }
                    });
                }

                return topic.attributeSets()
            }).then(attributeSets => {
                themeTopic.attributeSets = [];

                return Promise.all(attributeSets.map(attributeSet => {
                    let attrSet = null;
                    return attributeSet.json().then(pAttrSet => {
                        attrSet = {
                            id: pAttrSet._id,
                            columnName: pAttrSet.columnName,
                            type: pAttrSet.type,
                            name: pAttrSet.name,
                            filteringAttributeValue: pAttrSet.filteringAttributeValue
                        };
                        attrSet.attributes = [];
                        themeTopic.attributeSets.push(attrSet);

                        return attributeSet.attributes();
                    }).then(attributes => {
                        return Promise.all(attributes.map(attribute=> {
                            return attribute.json().then(attr => {
                                attrSet.attributes.push({
                                    id: attr._id,
                                    name: attr.name,
                                    code: attr.code
                                });
                            })
                        })).catch(err => {
                            console.log(err);
                        })
                    }).catch(err => {
                        console.log(err);
                    });
                }))
            }).catch(err => {
                console.log(err);
            });
        })).then(() => {
            // Remove topics without integrationType.
            scope.themes = scope.themes.filter(theme => theme.integrationType);
            return scope;
        })
    }

    layers(integrationInput, files) {
        integrationInput.layers = [];
        return Promise.all(Object.keys(files).map(fileKey => {
            const pathToFile = files[fileKey].path;
            const fileName = files[fileKey].originalFilename;
            if(!fileName) {
                return Promise.resolve(true);
            }

            const fileNameInStorage = `${integrationInput.uuid}/${fileName}`;
            return new Promise((resolve, reject) => {
                fs.readFile(pathToFile, 'utf8', (err, data) => {
                    if(err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                })
            }).then(result => {
                return this._storage.upload(fileNameInStorage, result);
            }).then(() => {
                // If fileName matches AL template push to proper AU templates instead.
                let isAu = false;
                integrationInput.analyticalUnitLevels.forEach(auLevel => {
                    if(RegExp(auLevel.template).test(fileName)) {
                        isAu = true;

                        auLevel.layer = fileNameInStorage;
                    }
                });

                if(!isAu) {
                    integrationInput.layers.push({
                        name: fileName.replace('\.geojson', ''),
                        content: fileNameInStorage
                    })
                }
            })
        })).then(() => {
            integrationInput.analyticalUnitLevels = integrationInput.analyticalUnitLevels.filter(au => au.layer);
        });
    }

    layerRefs(inputForAnalysis, id){
        const layerRefs = [];

        inputForAnalysis.themes.forEach(theme => {
            if(theme.layerUnavailable || !theme.periods){
                return;
            }

            inputForAnalysis.analyticalUnitLevels.forEach((auLevel, auLevelIndex) => {
                theme.periods.forEach(period => {
                    theme.attributeSets.forEach(attributeSet => {
                        const attributes = [];

                        attributeSet.attributes.forEach(attribute => {
                            attributes.push({
                                column: `as_${attributeSet.id}_attr_${attribute.id}_p_${period}`,
                                attribute: attribute.id
                            })
                        });

                        layerRefs.push({
                            "_id": ++id,
                            "layer": 'geonode:' + auLevel.table,
                            "columnMap": attributes,
                            isData: true,
                            fidColumn: `AL${auLevelIndex+1}_ID`,
                            nameColumn: `AL${auLevelIndex+1}_ID`,
                            parentColumn: auLevel !== 0 ? `AL${auLevelIndex}_ID` : null,
                            attributeSet: attributeSet.id,
                            location: inputForAnalysis.place,
                            year: period, // Periods depends on the analysis.
                            areaTemplate: auLevel.id,
                            active: true,
                            dataSourceOrigin: 'geonode'
                        });
                    })
                })
            })
        });

        return layerRefs;
    }

    async loadTopics(themesForScope) {
        return Promise.all(themesForScope.map(theme => {
            return theme.topics(MongoTopic);
        }));
    }
}

module.exports = MetadataForIntegration;