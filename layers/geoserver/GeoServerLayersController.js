let config = require('../../config');
let logger = require('../../common/Logger').applicationWideLogger;

let FilteredBaseLayerReferences = require('../FilteredBaseLayerReferences');
let GeoServerLayerStyles = require('../GeoServerLayerStyles');
let GeoServerStyles = require('../../styles/GeoserverStyles');
let SldStyle = require('../../styles/SldStyle');
let UUID = require('../../common/UUID');

/**
 *
 */
class GeoServerLayersController {
	constructor(app, mongo, pool, schema) {
		this._mongo = mongo;
		this._styles = new GeoServerStyles(pool, schema);
		var url = 'http://' + config.geoserverHost + ":" + config.geoserverPort + config.geoserverPath;
		this._styledLayers = new GeoServerLayerStyles(url,config.geoserverUsername,config.geoserverPassword);

		app.post('/rest/geoserver/layer', this.createLayer.bind(this));
		app.delete('/rest/geoserver/layer', this.removeLayer.bind(this));
	}

	createLayer(request, response) {
		let styleId = new UUID().toString();
		let style = request.body.style;
		let places = request.body.places.map(place => Number(place));
		let analyticalUnitLevel = Number(request.body.analyticalUnitLevel);
		let baseLayerIds, layers;
		logger.info(`GeoServerLayersController#createLayer Places: ${places.join(',')} AnalyticalUnitLevel: ${analyticalUnitLevel}`);

		new FilteredBaseLayerReferences({
			areaTemplate: analyticalUnitLevel,
			location: {$in: places}
		}, this._mongo).layerReferences().then(layers => {
			if(layers.length === 0) {
				throw new Error(`No base layers found for given combination.`);
			}
			baseLayerIds = layers.map(layer => layer._id);
            logger.info(`GeoServerLayersController#createLayer Style: ${style}`); // TODO: Deploy and verify.
            return this._styles.add(new SldStyle(styleId, style));
		}).then(() => {
			let promise = Promise.resolve(null);
            logger.info(`GeoServerLayersController#createLayer Layers: ${baseLayerIds.join(',')}, Style Id: ${styleId}`); // TODO: Deploy and verify.
            baseLayerIds.forEach(layerId => {
				promise = promise.then(() => {
					return this._styledLayers.create(`${config.geoserverWorkspace}:layer_${layerId}`, styleId)
				})
			});

			return promise
		}).then(() => {
			layers = baseLayerIds.map(id => `${config.geoserverWorkspace}:layer_${id}`).join(',');
            logger.info(`GeoServerLayersController#createLayer Layers: ${layers}, Style Id: ${styleId}`); // TODO: Deploy and verify.
            response.json({
				layer: layers,
				styleId: styleId
			});
		}).catch(error => {
			response.status(500).json({
				message: logger.error(`GeoServerLayersController#createLayer Error: `, error)
			})
		});
	}

	removeLayer(request, response) {
		logger.info(`GeoServerLayersController#remvoeLayer`);

		// TODO: In the second version, correctly clean the stuff.
		response.json({
			status: 'ok'
		});
	}
}

module.exports = GeoServerLayersController;