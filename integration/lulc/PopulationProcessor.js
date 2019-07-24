const turf = require('turf');
const _ = require('lodash');

class PopulationProcessor {
    /**
     *
     * @param attributes Array of the attributes. Index in the field represents Level of the LULC.
     * @param areasVectorLayer GeoJSON representing the areas to calculate the distribution for
     * @param lulcVectorLayer GeoJSON representing the areas representing the mapped LULC.
     */
    constructor(attributes, areasVectorLayer, lulcVectorLayer) {
        this._attributes = attributes;
        this._areasVectorLayer = areasVectorLayer;
        this._lulcLayer = lulcVectorLayer;
    }

    attributes() {
        this._areasVectorLayer.features.forEach((analyticalUnit) => {
            // Provide attributes for multiple layers at once.
            const attributesAreas = {};
            this._attributes.forEach(attribute => {
                attributesAreas[attribute.columnName] = {
                    value: 0,
                    id: attribute.id
                };
            });
            // The column Name is relevant to the problem.

            this._lulcLayer.features.forEach(feature => {
                try {
                    const intersectingPolygon = turf.intersect(analyticalUnit, feature);

                    if(intersectingPolygon) {
                        const intersectionArea = Number(turf.area(intersectingPolygon).toFixed(3));
                        const featureArea = Number(turf.area(feature).toFixed(3));
                        if(intersectionArea > featureArea) {
                            console.log(`${intersectionArea} ${featureArea}`);
                            console.log(`
                            =============================
                            ERROR: The Area is too large;
                            ============================
                            `)
                        }
                        const areaPercentageFraction = Math.min(intersectionArea / featureArea, 1);
                        if(Number.isNaN(areaPercentageFraction)) {
                            return;
                        }

                        // Different attributes have different column names
                        this._attributes.forEach(attribute => {
                            const value = feature.properties[attribute.columnName];
                            attributesAreas[attribute.columnName].value += (value * areaPercentageFraction);
                        });
                    }
                } catch(err) {
                    //console.log('Err: ', err, ' Feature: ', feature.properties['ID']);
                }
            });

            console.log(attributesAreas);

            this._attributes.forEach(attribute => {
                analyticalUnit.properties[attribute.id] = Math.ceil(attributesAreas[attribute.columnName].value);
            });
        });
    }

    /**
     * Returns GeoJSON representing analysis for certain vector layer.
     */
    geoJson() {
        this.attributes();

        return this._areasVectorLayer;
    }
}

module.exports = PopulationProcessor;