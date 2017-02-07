let logger = require('../common/Logger').applicationWideLogger;
let config = require('../config');

let GeoServerImporter = require('./GeoServerImporter');

class ImportLayerController {
	constructor(app) {
		app.post('/import/layer', this.importLayer.bind(this));

		this.geoServerImporter = new GeoServerImporter(config.geoServerUrl, config.geoserverUsername, config.geoserverPassword, config.geoserverWorkspace, config.geoServerDataStore);
	}

	importLayer(request, response, next) {
		this.geoServerImporter.importLayer(request.files.administrativeUnits).then(() => {
			response.status(200).json({status: "Ok"});
		}).catch(error => {
			logger.error(`ImportLayerController#importLayer Error: `, error);
			response.status(500).json({status: "Err"});
		});
	}
}

module.exports = ImportLayerController;