const ConnectivityNodes = require('./ConnectivityNodes');
const LulcProcessor = require('./LulcProcessor');
const TransportationNetwork = require('./TransportationNetwork');

class CityAnalysisProcessor {
    constructor(integrationInput) {
        this._integrationInput = integrationInput;
    }

    geoJson() {
        const analysisRelatedThemes = this._integrationInput.themes;
        const layers = this._integrationInput.layers;
        const analyticalUnitsLevels = this._integrationInput.analyticalUnitLevels.map(analyticalUnitLevel => {
            return analyticalUnitLevel.layer;
        });
        this._integrationInput.analyticalUnitLevels.forEach(au => {
            au.table = au.table.split(':')[1];
        });

        analysisRelatedThemes.forEach(theme => {
            const integrationType = theme.integrationType;
            if (integrationType === 'landUseLandCoverVeryHighResolution') {
                this.landUseLandCoverAnalysis(theme, layers, analyticalUnitsLevels,  'lulcVhr'+theme.id);
            } else if (integrationType === 'landUseLandCoverChangeFlow') {
                this.flowChangeAnalysis(theme, layers, analyticalUnitsLevels, 'flowChange' +theme.id);
            } else if (integrationType === 'urbanGreenExtended') {
                this.landUseLandCoverAnalysis(theme, layers, analyticalUnitsLevels, 'urbanGreen'+theme.id);
            } else if (integrationType === 'transportationNetwork') {
                this.transportationNetwork(theme, layers, analyticalUnitsLevels, 'transportationNetwork');
            } else if (integrationType === 'connectivityNode') {
                this.calculateAmountOfNodes(theme, layers, analyticalUnitsLevels);
            } else if (integrationType === 'informalSettlement') {
                this.landUseLandCoverAnalysis(theme, layers, analyticalUnitsLevels, 'informalSettlements'+theme.id);
            } else if (integrationType === 'floods') {
                this.landUseLandCoverAnalysis(theme, layers, analyticalUnitsLevels, 'floods'+theme.id);
            }
        });

        return analyticalUnitsLevels;
    }

    getPeriodByName(name) {
        return this._integrationInput.periods.filter(period => {
            return period.periods.indexOf(name) !== -1
        })[0];
    }

    flowChangeAnalysis(theme, layers, analyticalUnitsLevels, attributeContainer) {
        // Each Attribute Set needs to be handled separately.
        const presentLayers = this.filterPresentLayers(theme.layerTemplates, layers);
        if (presentLayers.length !== 1) {
            theme.layerUnavailable = true;
            console.error(`Land Use Land Cover Analysis Doesn't have relevant data. ${attributeContainer}`);
            return;
        }

        const firstPeriod = this.getPeriodByName(presentLayers[0].name.substr(-9, 4)).id;
        const firstPeriodName = presentLayers[0].name.substr(-9, 4);
        const lastPeriod = this.getPeriodByName(presentLayers[0].name.substr(-4)).id;
        const lastPeriodName = presentLayers[0].name.substr(-4);

        let isConsumptionFormationTheme = false;
        theme.attributeSets.forEach(attributeSet => {
            if(attributeSet.type && (attributeSet.type ==='consumption' || attributeSet.type === 'formation')) {
                isConsumptionFormationTheme = true;
            }
        });

        if(isConsumptionFormationTheme) {
            theme.periods = [firstPeriod];
        } else {
            theme.periods = [firstPeriod, lastPeriod];
        }

        // Generate the attributes per year
        theme.attributeSets.forEach(attributeSet => {
            // Attribute Sets that aren't either Consumption or Formation, which needs to be linked to both years.
            const allAttributes = [];

            attributeSet.attributes.forEach(attribute => {
                const period = firstPeriod;
                const periodName = attributeSet.type === 'formation' ? lastPeriodName: firstPeriodName;

                if(isConsumptionFormationTheme) {
                    allAttributes.push({
                        id: `as_${attributeSet.id}_attr_${attribute.id}_p_${period}`,
                        code: attribute.code,
                        columnName: attributeSet.columnName + '_' + periodName
                    });
                } else {
                    allAttributes.push({
                        id: `as_${attributeSet.id}_attr_${attribute.id}_p_${firstPeriod}`,
                        code: attribute.code,
                        columnName: attributeSet.columnName
                    });
                    allAttributes.push({
                        id: `as_${attributeSet.id}_attr_${attribute.id}_p_${lastPeriod}`,
                        code: attribute.code,
                        columnName: attributeSet.columnName
                    });
                }
            });
            // Filter the content of the LULC Change Layer to provide a source for Processor.

            const attributeSetLayer = {
                features: presentLayers[0].content.features.filter(feature => {
                    return theme.filteringAttribute ? feature.properties[theme.filteringAttribute] == attributeSet.filteringAttributeValue: true;
                })
            };

            analyticalUnitsLevels.forEach((analyticalUnitsLevel, index) => {
                new LulcProcessor(allAttributes, analyticalUnitsLevel, attributeSetLayer, index + 1).geoJson();
            });
        });
    }

    transportationNetwork(theme, layers, analyticalUnitsLevels) {
        // There may be multiple layers. We need to find out the proper periods based on this information.
        const presentLayers = this.filterPresentLayers(theme.layerTemplates, layers);
        if (presentLayers.length !== theme.layerTemplates.length) {
            theme.layerUnavailable = true;
            console.error(`Transportation Network Analysis Doesn't have relevant data.`);
            return;
        }

        // Attributes are per period.
        const periods = presentLayers.map(layer => {
            return this.getPeriodByName(layer.name.substr(-4)).id;
        });
        theme.periods = periods;

        periods.forEach((period, index) => {
            const allAttributes = [];
            // Generate the attributes per year
            theme.attributeSets.forEach(attributeSet => {
                attributeSet.attributes.forEach(attribute => {
                    allAttributes.push({
                        id: `as_${attributeSet.id}_attr_${attribute.id}_p_${period}`,
                        code: attribute.code,
                        columnName: attributeSet.columnName
                    });
                });
            });

            analyticalUnitsLevels.forEach(analyticalUnitsLevel => {
                new TransportationNetwork(allAttributes, analyticalUnitsLevel, presentLayers[index].content).geoJson();
            });
        });
    }

    landUseLandCoverAnalysis(theme, layers, analyticalUnitsLevels, attributeContainer) {
        // There may be multiple layers. We need to find out the proper periods based on this information.
        const presentLayers = this.filterPresentLayers(theme.layerTemplates, layers);
        if (presentLayers.length !== theme.layerTemplates.length) {
            theme.layerUnavailable = true;
            console.error(`Land Use Land Cover Analysis Doesn't have relevant data. ${attributeContainer}`);
            return;
        }

        // Attributes are per period.
        const periods = presentLayers.map(layer => {
            return this.getPeriodByName(layer.name.substr(-4)).id;
        });
        theme.periods = periods;

        periods.forEach((period, indexPeriod) => {
            const allAttributes = [];
            // Generate the attributes per year
            theme.attributeSets.forEach(attributeSet => {
                attributeSet.attributes.forEach(attribute => {
                    allAttributes.push({
                        id: `as_${attributeSet.id}_attr_${attribute.id}_p_${period}`,
                        code: attribute.code,
                        columnName: attributeSet.columnName
                    });
                });
            });

            analyticalUnitsLevels.forEach((analyticalUnitsLevel, index) => {
                new LulcProcessor(allAttributes, analyticalUnitsLevel, presentLayers[indexPeriod].content, index +1).geoJson();
            });
        });
    }

    calculateAmountOfNodes(theme, layers, analyticalUnitsLevels) {
        // There may be multiple layers. We need to find out the proper periods based on this information.
        const presentLayers = this.filterPresentLayers(theme.layerTemplates, layers);
        if (presentLayers.length !== theme.layerTemplates.length) {
            theme.layerUnavailable = true;
            console.error(`Land Use Land Cover Analysis Doesn't have relevant data.`);
            return;
        }

        // Attributes are per period.
        const periods = presentLayers.map(layer => {
            return this.getPeriodByName(layer.name.substr(-4)).id;
        });
        theme.periods = periods;

        periods.forEach((period, index) => {
            const allAttributes = [];
            // Generate the attributes per year
            theme.attributeSets.forEach(attributeSet => {
                attributeSet.attributes.forEach(attribute => {
                    allAttributes.push({
                        id: `as_${attributeSet.id}_attr_${attribute.id}_p_${period}`,
                        code: attribute.code,
                        columnName: attributeSet.columnName
                    });
                });
            });

            analyticalUnitsLevels.forEach(analyticalUnitsLevel => {
                new ConnectivityNodes(allAttributes, analyticalUnitsLevel, presentLayers[index].content, 'calculationNodes').geoJson();
            });
        });
    }

    filterPresentLayers(layerTemplates, layers) {
        // Return all layers that satisfy at least one layer template.
        const presentLayers = [];

        layerTemplates.forEach(template => {
            layers.forEach(layer => {
                if(RegExp(template.layerNameTemplate).test(layer.name)) {
                    presentLayers.push(layer);
                }
            });
        });

        return presentLayers;
    }
}

module.exports = CityAnalysisProcessor;