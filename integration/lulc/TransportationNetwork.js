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
            try {
                // Provide attributes for multiple layers at once.
                const attributesAreas = {
                    'total': {
                        area: 0,
                        id: 'total'
                    }
                };
                this._attributes.forEach(attribute => {
                    if (_.isArray(attribute.code)) {
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
                    if(line.geometry.type === "MultiLineString") {
                        line.geometry.coordinates.forEach(part => {
                            // It differs with LineString and MultiLineString
                            this.handleCoordinatesForOneLineString(part, line, analyticalUnit, attributesAreas);
                        });
                    } else {
                        this.handleCoordinatesForOneLineString(line.geometry.coordinates, line, analyticalUnit, attributesAreas);
                    }
                });

                console.log(attributesAreas);

                this._attributes.forEach(attribute => {
                    if (_.isArray(attribute.code)) {
                        let areaForCodes = 0;
                        attribute.code.forEach(code => {
                            areaForCodes += attributesAreas[code].area;
                        });
                        analyticalUnit.properties[attribute.id] = areaForCodes * 1000;
                    } else if (!attribute.code) {
                        analyticalUnit.properties[attribute.id] = attributesAreas['total'].area * 1000;
                    } else {
                        analyticalUnit.properties[attribute.id] = attributesAreas[attribute.code].area * 1000;
                    }
                });
            } catch (error) {
                console.log(error);
            }
        });

        return this._areasVectorLayer;
    }

    handleCoordinatesForOneLineString(part, line, analyticalUnit, attributesAreas) {
        try {
            const lineStringResult = turf.lineString(part);
            if (!lineStringResult.bbox) {
                lineStringResult.bbox = turf.bbox(lineStringResult);
            }
            let split = turf.lineSplit(lineStringResult, analyticalUnit);
            // If the split returns empty array then either both parts are outside or inside the polygon
            if (split.features.length === 0) {
                // If it is inside take the whole length;
                if (turf.booleanPointInPolygon(turf.point(part[0]), analyticalUnit) && turf.booleanPointInPolygon(turf.point(part[part.length - 1]), analyticalUnit)) {
                    const lengthOfLine = turf.length(turf.lineString(part));
                    const usedCodes = [];
                    this._attributes.forEach(attribute => {
                        const codeOfPolygon = line.properties[attribute.columnName];
                        if (typeof attributesAreas[codeOfPolygon] !== 'undefined' && usedCodes.indexOf(codeOfPolygon) === -1) {
                            attributesAreas[codeOfPolygon].area += lengthOfLine;
                            usedCodes.push(codeOfPolygon);
                        }
                    });
                    attributesAreas['total'].area += lengthOfLine;
                }
            } else {
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
                        const usedCodes = [];
                        this._attributes.forEach(attribute => {
                            const codeOfPolygon = line.properties[attribute.columnName];
                            if (typeof attributesAreas[codeOfPolygon] !== 'undefined' && usedCodes.indexOf(codeOfPolygon) === -1) {
                                attributesAreas[codeOfPolygon].area += lengthOfLine;
                                usedCodes.push(codeOfPolygon);
                            }
                        });
                        attributesAreas['total'].area += lengthOfLine;
                    }
                });
            }
        } catch (err) {
            console.log('ERROR ', err, ' ', part);
        }
    }
}

module.exports = TransportationNetwork;