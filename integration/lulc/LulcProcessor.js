const turf = require('turf');
const _ = require('lodash');

class LulcProcessor {
    /**
     *
     * @param attributes Array of the attributes. Index in the field represents Level of the LULC.
     * @param areasVectorLayer GeoJSON representing the areas to calculate the distribution for
     * @param lulcVectorLayer GeoJSON representing the areas representing the mapped LULC.
     */
    constructor(attributes, areasVectorLayer, lulcVectorLayer, auLevel) {
        this._attributes = attributes;
        this._areasVectorLayer = areasVectorLayer;
        this._lulcLayer = lulcVectorLayer;
        this._auLevel = auLevel;
    }

    attributes() {
        this._areasVectorLayer.features.forEach((analyticalUnit) => {
            // Provide attributes for multiple layers at once.
            const attributesAreas = {
                'total': {
                    area: 0,
                    id: 'total'
                }
            };
            this._attributes.forEach(attribute => {
                if(_.isArray(attribute.code)) {
                    attribute.code.forEach(code => {
                        attributesAreas[code] = {
                            area: 0,
                            id: attribute.id
                        };
                    });
                } else {
                    attributesAreas[attribute.code] = {
                        area: 0,
                        id: attribute.id
                    };
                }
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

                        const usedCodes = [];
                        // Different attributes have different column names
                        this._attributes.forEach(attribute => {
                            const codeOfPolygon = feature.properties[attribute.columnName];
                            if(typeof attributesAreas[codeOfPolygon] !== 'undefined' && usedCodes.indexOf(codeOfPolygon) === -1) {
                                attributesAreas[codeOfPolygon].area += intersectionArea;
                                usedCodes.push(codeOfPolygon);
                            }
                        });
                        attributesAreas['total'].area += intersectionArea;
                    }
                } catch(err) {
                    console.log('Err: ', err, 'AU: ', analyticalUnit.properties['AL2_ID'], ' Feature: ', feature.properties['ID']);
                }
            });

            console.log(attributesAreas);

            this._attributes.forEach(attribute => {
                if(_.isArray(attribute.code)) {
                    let areaForCodes  = 0;
                    attribute.code.forEach(code => {
                        areaForCodes += attributesAreas[code].area;
                    });
                    analyticalUnit.properties[attribute.id] = (areaForCodes / turf.area(analyticalUnit)) * analyticalUnit.properties[`AL${this._auLevel}_AREA`];
                } else if(!attribute.code) {
                    analyticalUnit.properties[attribute.id] = (attributesAreas['total'].area / turf.area(analyticalUnit)) * analyticalUnit.properties[`AL${this._auLevel}_AREA`];
                    if(analyticalUnit.properties[attribute.id] > analyticalUnit.properties[`AL${this._auLevel}_AREA`]) {
                        analyticalUnit.properties[attribute.id] = analyticalUnit.properties[`AL${this._auLevel}_AREA`];
                    }
                } else {
                    analyticalUnit.properties[attribute.id] = (attributesAreas[attribute.code].area / turf.area(analyticalUnit)) * analyticalUnit.properties[`AL${this._auLevel}_AREA`];
                }
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

module.exports = LulcProcessor;