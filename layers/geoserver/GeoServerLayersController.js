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
		this._styledLayers = new GeoServerLayerStyles(config.geoServerUrl,config.geoserverUsername,config.geoserverPassword);

		app.post('/rest/geoserver/layer', this.createLayer.bind(this));
		app.delete('/rest/geoserver/layer', this.removeLayer.bind(this));
	}

	createLayer(request, response) {
		let styleId = new UUID().toString();
		let style = request.body.style;
		let places = request.body.places;
		let analyticalUnitLevel = request.body.analyticalUnitLevel;
		let baseLayerIds, layers;

		new FilteredBaseLayerReferences({
			areaTemplate: analyticalUnitLevel,
			place: {$in: [places]}
		}, this._mongo).layerReferences().then(layers => {
			baseLayerIds = layers.map(layer => layer._id);
			return this._styles.add(new SldStyle(styleId, style));
		}).then(() => {
			let promise = Promise.resolve(null);
			baseLayerIds.forEach(layerId => {
				promise = promise.then(() => {
					return this._styledLayers.create(`${config.geoserverWorkspace}:layer_${layerId}`, styleId)
				})
			});

			return promise
		}).then(() => {
			layers = baseLayerIds.map(id => `${config.geoserverWorkspace}:layer_${id}`).join(',');
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
		// TODO: In the second version, correctly clean the stuff.
		response.json({
			status: 'ok'
		});
	}
}

module.exports = GeoServerLayersController;