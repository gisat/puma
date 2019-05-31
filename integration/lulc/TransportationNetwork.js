const turf = require('turf');
const _ = require('lodash');

class TransportationNetwork {
    constructor(attributes, areasVectorLayer, transportationVectorLayer) {
        this._attributes = attributes;
        this._areasVectorLayer = areasVectorLayer;
        this._transportationVectorLayer = transportationVectorLayer;
    }

    geoJson() {
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

            this._transportationVectorLayer.features.forEach(line => {
                line.geometry.coordinates.forEach(part => {
                    try {
                        let split = turf.lineSplit(turf.lineString(part), analyticalUnit);
                        // If the split returns empty array then either both parts are outside or inside the polygon
                        if (split.features.length === 0) {
                            // If it is inside take the whole length;
                            if (turf.booleanPointInPolygon(turf.point(part[0]), analyticalUnit) && turf.booleanPointInPolygon(turf.point(part[part.length - 1]), analyticalUnit)) {
                                const lengthOfLine = turf.length(turf.lineString(part));
                                this._attributes.forEach(attribute => {
                                    const codeOfPolygon = line.properties[attribute.columnName];
                                    if (typeof attributesAreas[codeOfPolygon] !== 'undefined') {
                                        attributesAreas[codeOfPolygon].area += lengthOfLine;
                                    }
                                });
                                attributesAreas['total'].area += lengthOfLine;
                            }
                        }

                        // This decides whether odd or even parts of the Line String are in the polygon.
                        let oddPair;
                        if (turf.booleanPointInPolygon(turf.point(part[0]), analyticalUnit)) {
                            oddPair = 0;
                        } else {
                            oddPair = 1;
                        }

                        split.features.forEach((splitPart, i) => {
                            if ((i + oddPair) % 2 === 0) {
                                const lengthOfLine = turf.length(splitPart);
                                this._attributes.forEach(attribute => {
                                    const codeOfPolygon = line.properties[attribute.columnName];
                                    if (typeof attributesAreas[codeOfPolygon] !== 'undefined') {
                                        attributesAreas[codeOfPolygon].area += lengthOfLine;
                                    }
                                });
                                attributesAreas['total'].area += lengthOfLine;
                            }
                        });
                    } catch(err) {
                        console.log('ERROR ', err, ' ', part);
                    }
                });
            });

            this._attributes.forEach(attribute => {
                if(_.isArray(attribute.code)) {
                    let areaForCodes  = 0;
                    attribute.code.forEach(code => {
                        areaForCodes += attributesAreas[code].area;
                    });
                    analyticalUnit.properties[attribute.id] = areaForCodes;
                } else if(!attribute.code) {
                    analyticalUnit.properties[attribute.id] = attributesAreas['total'].area;
                } else {
                    analyticalUnit.properties[attribute.id] = attributesAreas[attribute.code].area;
                }
            });
        });

        return this._areasVectorLayer;
    }
}

module.exports = TransportationNetwork;