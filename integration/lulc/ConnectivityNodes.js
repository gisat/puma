const turf = require('turf');

class ConnectivityNodes {
    constructor(analyticalUnitsLayer, connectivityNodesLayer, attributeContainer) {
        this._analyticalUnitsLayer = analyticalUnitsLayer;
        this._connectivityNodesLayer = connectivityNodesLayer;
        this._attributeContainer = attributeContainer;
    }

    geoJson() {
        this._analyticalUnitsLayer.features.forEach(analyticalUnit => {
            let nodesInArea = 0;

            this._connectivityNodesLayer.features.forEach(point => {
                if(turf.booleanPointInPolygon(point, analyticalUnit)){
                    nodesInArea++;
                }
            });

            // TODO: Get information about the attribute name to use.
            analyticalUnit.properties[this._attributeContainer + 'nodes'] = nodesInArea;
        });

        return this._analyticalUnitsLayer;
    }
}

module.exports = ConnectivityNodes;