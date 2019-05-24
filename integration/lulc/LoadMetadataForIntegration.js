const _ = require('lodash');

const MongoScope = require('../../metadata/MongoScope');
const MongoTopic = require('../../metadata/MongoTopic');
const FilteredMongoPeriods = require('../../metadata/FilteredMongoPeriods');

class LoadMetadataForIntegration {
    /**
     *
     * @param mongo
     * @param scope Id of the scope.
     */
    constructor(mongo, scope) {
        this._mongo = mongo;
        this._scope = new MongoScope(scope, this._mongo);
    }

    async metadata(place) {
        const themesForScope = await this._scope.themes();
        let topics = await this.loadTopics(themesForScope);
        topics = _.flatten(topics);
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

    async loadTopics(themesForScope) {
        return Promise.all(themesForScope.map(theme => {
            return theme.topics(MongoTopic);
        }));
    }
}

module.exports = LoadMetadataForIntegration;