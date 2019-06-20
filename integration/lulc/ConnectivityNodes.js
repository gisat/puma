const turf = require('turf');
const _ = require('lodash');

class ConnectivityNodes {
    constructor(attributes, analyticalUnitsLayer, connectivityNodesLayer) {
        this._analyticalUnitsLayer = analyticalUnitsLayer;
        this._connectivityNodesLayer = connectivityNodesLayer;
        this._attributes = attributes;
    }

    geoJson() {
        this._analyticalUnitsLayer.features.forEach(analyticalUnit => {
            try {
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

                let nodesInArea = 0;
                this._connectivityNodesLayer.features.forEach(point => {
                    if (turf.booleanPointInPolygon(point, analyticalUnit)) {
                        const usedCodes = [];
                        this._attributes.forEach(attribute => {
                            const codeOfPolygon = point.properties[attribute.columnName];
                            if (typeof attributesAreas[codeOfPolygon] !== 'undefined' && usedCodes.indexOf(codeOfPolygon) === -1) {
                                attributesAreas[codeOfPolygon].area += 1;
                                usedCodes.push(codeOfPolygon);
                            }
                        });
                        attributesAreas['total'].area += 1;
                        nodesInArea++;
                    }
                });

                this._attributes.forEach(attribute => {
                    if (_.isArray(attribute.code)) {
                        let areaForCodes = 0;
                        attribute.code.forEach(code => {
                            areaForCodes += attributesAreas[code].area;
                        });
                        analyticalUnit.properties[attribute.id] = areaForCodes;
                    } else if (!attribute.code) {
                        analyticalUnit.properties[attribute.id] = attributesAreas['total'].area;
                    } else {
                        analyticalUnit.properties[attribute.id] = attributesAreas[attribute.code].area;
                    }
                });
            } catch(err) {
                console.log(err);
            }
        });

        return this._analyticalUnitsLayer;
    }
}

module.exports = ConnectivityNodes;