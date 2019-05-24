const turf = require('turf');

class TransportationNetwork {
    constructor(attributes, areasVectorLayer, transportationVectorLayer, attributeContainer) {
        this._attributes = attributes;
        this._areasVectorLayer = areasVectorLayer;
        this._transportationVectorLayer = transportationVectorLayer;
        this._attributeContainer = attributeContainer;
    }

    geoJson() {
        this._areasVectorLayer.features.forEach((analyticalUnit) => {
            // Provide attributes for multiple layers at once.
            const attributesAreas = {
                total: {
                    measuredLength: 0,
                    id: 'total'
                }
            };
            this._attributes.forEach(attribute => {
                attributesAreas[attribute.code] = {
                    measuredLength: 0,
                    id: attribute.id,
                };
            });

            // Preprocess by changing from MultiLineStrings to LineStrings.
            const lineStrings = this._transportationVectorLayer.features.map(feature => {
                try {
                    return turf.lineToPolygon(feature, {properties: feature.properties});
                } catch(e){
                    console.log(e, feature);
                }
            });

            // TODO: The results are wrong.
            // What if the line is fully in polygon
            lineStrings.forEach(feature => {
                try {
                    const lineDistance = turf.lineDistance(turf.intersect(analyticalUnit, feature));
                    console.log(lineDistance);

                    // if(intersectingLine.features.length < 1) {
                    //     return;
                    // }
                    // const intersection = turf.lineSlice(intersectingLine[0], intersectingLine[1], feature);
                    //
                    // if(intersectingLine.features.length > 0) {
                    //     this._attributes.forEach(attribute => {
                    //         const codeOfPolygon = feature.properties[attribute.columnName];
                    //         if (typeof attributesAreas[codeOfPolygon] !== 'undefined') {
                    //             attributesAreas[codeOfPolygon].measuredLength += turf.length(intersection);
                    //         }
                    //         attributesAreas['total'].measuredLength += turf.length(intersection);
                    //     });
                    // }
                } catch(err) {
                    console.log('Error: ', err , 'AU: ', analyticalUnit, ' Feature: ', feature);
                }
            });

            analyticalUnit.properties[this._attributeContainer] = {};
            this._attributes.forEach(attribute => {
                analyticalUnit.properties[this._attributeContainer][attribute.id] = attributesAreas[attribute.code].area;
            });
            console.log(attributesAreas);
        });

        return this._areasVectorLayer.features.map(area => {
            return area.properties[this._attributeContainer];
        });
    }
}

module.exports = TransportationNetwork;