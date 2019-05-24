const ConnectivityNodes = require('./ConnectivityNodes');
const LulcProcessor = require('./LulcProcessor');
const TransportationNetwork = require('./TransportationNetwork');

class IntegrateCityProcessor {
    constructor(integrationInput) {
        this._integrationInput = integrationInput;
    }

    // Mongo and PostgreSQL metadata to be inserted.
    geoJson() {
        const analysisRelatedThemes = this._integrationInput.themes;
        const layers = this._integrationInput.layers;
        const analyticalUnitsLevels = this._integrationInput.analyticalUnitLevels.map(analyticalUnitLevel => {
            return analyticalUnitLevel.layer;
        });

        // The core metadata means the layerrefs. The rest of the metadata are already in place.
        // Creation of SQL script creation for the layers. This happens after the AL are updated with results of analysis.
        // Into the Analytical Units Layers add all the necessary source data.
        // Gather from All themes the combinations of Attribute sets and Attributes.
        analysisRelatedThemes.forEach(theme => {
            const integrationType = theme.integrationType;
            if (integrationType === 'landUseLandCoverVeryHighResolution') {
                this.landUseLandCoverAnalysis(theme, layers, analyticalUnitsLevels, 'lulcVhr');
            } else if (integrationType === 'landUseLandCoverChangeFlow') {
                this.flowChangeAnalysis(theme, layers, analyticalUnitsLevels, 'flowChange');
            } else if (integrationType === 'urbanGreenExtended') {
                this.landUseLandCoverAnalysis(theme, layers, analyticalUnitsLevels, 'urbanGreen');
            } else if (integrationType === 'transportationNetwork') {
                // In this case we need to calculate the length od the areas.
                // TODO: Calculate the length of the transportation information.
                // this.transportationNetwork(theme, layers, analyticalUnitsLevels, 'transportationNetwork');
            } else if (integrationType === 'connectivityNode') {
                this.calculateAmountOfNodes(theme, layers, analyticalUnitsLevels);
            } else if (integrationType === 'informalSettlement') {
                this.landUseLandCoverAnalysis(theme, layers, analyticalUnitsLevels, 'informalSettlements');
            } else if (integrationType === 'floods') {
                this.landUseLandCoverAnalysis(theme, layers, analyticalUnitsLevels, 'floods');
            }
        });

        // Integrate the result into the PostGIS database.
        // The json should already be in the structure which will be possible to use in the views.
        // Views layer is available per period.
        // ogr2ogr -f "PostgreSQL" PG:"dbname=my_database user=postgres" "source_data.json"

        // Land Use Information will be available only for the certain cases.

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
        theme.periods = [firstPeriod, lastPeriod];

        // Generate the attributes per year
        theme.attributeSets.forEach(attributeSet => {
            const allAttributes = [];

            attributeSet.attributes.forEach(attribute => {
                const period = attributeSet.type === 'formation' ? lastPeriod: firstPeriod;
                const periodName = attributeSet.type === 'formation' ? lastPeriodName: firstPeriodName;

                allAttributes.push({
                    id: `as_${attributeSet.id}_attr_${attribute.id}_period_${period}`,
                    code: attribute.code,
                    columnName: attributeSet.columnName + '_' + periodName
                });
            });
            // Filter the content of the LULC Change Layer to provide a source for Processor.

            const attributeSetLayer = {
                features: presentLayers[0].content.features.filter(feature => {
                    return feature.properties[theme.filteringAttribute] == attributeSet.filteringAttributeValue;
                })
            };

            analyticalUnitsLevels.forEach(analyticalUnitsLevel => {
                new LulcProcessor(allAttributes, analyticalUnitsLevel, attributeSetLayer, attributeContainer).geoJson();
            });
        });
    }

    transportationNetwork(theme, layers, analyticalUnitsLevels, attributeContainer) {
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
                        id: `as_${attributeSet.id}_attr_${attribute.id}`,
                        code: attribute.code,
                        columnName: attributeSet.columnName
                    });
                });
            });

            analyticalUnitsLevels.forEach(analyticalUnitsLevel => {
                new TransportationNetwork(allAttributes, analyticalUnitsLevel, presentLayers[index].content, attributeContainer).geoJson();
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

        periods.forEach((period, index) => {
            const allAttributes = [];
            // Generate the attributes per year
            theme.attributeSets.forEach(attributeSet => {
                attributeSet.attributes.forEach(attribute => {
                    allAttributes.push({
                        id: `as_${attributeSet.id}_attr_${attribute.id}`,
                        code: attribute.code,
                        columnName: attributeSet.columnName
                    });
                });
            });

            analyticalUnitsLevels.forEach(analyticalUnitsLevel => {
                new LulcProcessor(allAttributes, analyticalUnitsLevel, presentLayers[index].content, attributeContainer).geoJson();
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
            analyticalUnitsLevels.forEach(analyticalUnitsLevel => {
                new ConnectivityNodes(analyticalUnitsLevel, presentLayers[index].content, 'calculationNodes').geoJson();
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

module.exports = IntegrateCityProcessor;