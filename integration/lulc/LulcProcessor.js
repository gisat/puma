const turf = require('turf');

class LulcProcessor {
    /**
     *
     * @param attributes Array of the attributes. Index in the field represents Level of the LULC.
     * @param areasVectorLayer GeoJSON representing the areas to calculate the distribution for
     * @param lulcVectorLayer GeoJSON representing the areas representing the mapped LULC.
     * @param attributeContainer Name under which the results of the analysis will be stored in the resulting geoJson properties.
     */
    constructor(attributes, areasVectorLayer, lulcVectorLayer, attributeContainer) {
        this._attributes = attributes;
        this._areasVectorLayer = areasVectorLayer;
        this._lulcLayer = lulcVectorLayer;
        this._attributeContainer = attributeContainer;
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
                attributesAreas[attribute.code] = {
                    area: 0,
                    id: attribute.id
                };
            });

            this._lulcLayer.features.forEach(feature => {
                try {
                    const intersectingPolygon = turf.intersect(analyticalUnit, feature);

                    if(intersectingPolygon) {
                        // Different attributes have different column names
                        this._attributes.forEach(attribute => {
                            const codeOfPolygon = feature.properties[attribute.columnName];
                            if(typeof attributesAreas[codeOfPolygon] !== 'undefined') {
                                attributesAreas[codeOfPolygon].area += turf.area(intersectingPolygon);
                            }
                            attributesAreas['total'].area += turf.area(intersectingPolygon);
                        })
                    }
                } catch(err) {
                    console.log('Err: ', err, 'AU: ', analyticalUnit.properties['AL2_ID'], ' Feature: ', feature.properties['ID']);
                }
            });

            this._attributes.forEach(attribute => {
                analyticalUnit.properties[attribute.id] = attributesAreas[attribute.code].area;
            });
            analyticalUnit.properties[this._attributeContainer + 'total'] = attributesAreas['total'].area;
            console.log(attributesAreas);
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