let logger = require('../common/Logger').applicationWideLogger;
let superagent = require('superagent');
let Promise = require('promise');

class GeonodeUpdateLayers {
    constructor() {
    }
    
    /**
     * Update geonode from geoserver based on given filter
     * @param filter {layer: "layerName", workspace: "workspaceName", datastore: "datastoreName"}
     */
    filtered(filter) {
        let updateLayersParameters = [];
        if (filter && filter.layer) {
            updateLayersParameters.push(`f=${filter.layer}`);
        }
        if (filter && filter.workspace) {
            updateLayersParameters.push(`w=${filter.workspace}`);
        }
        if (filter && filter.datastore) {
            updateLayersParameters.push(`s=${filter.datastore}`);
        }
        if (updateLayersParameters.length) {
            return superagent
                .get(`http://localhost/cgi-bin/updatelayers?${updateLayersParameters.join(`&`)}`);
        } else {
            return Promise.rejected(`Empty filter!`)
        }
    }
}

module.exports = GeonodeUpdateLayers;