var superagent = require('superagent');

/**
 * It stores the information about the combination of layer and style.
 */
class GeoServerLayerStyles {
	constructor(url, userName, password) {
		this._url = url;
		this._userName = userName;
		this._password = password;
	}

	/**
	 * It creates new connection between style and geoserver.
	 * @param layerName {String} Name of the layer as perceived by the geoserver
	 * @param style {String} Name of the style as perceived by the geoserver
	 */
	create(layerName, style) {
		return this.update(layerName, style);
	}

	/**
	 * It updates connection between style and geoserver by adding style to the list of styles of the layer.
	 * @param layerName {String} Name of the layer as perceived by the geoserver
	 * @param style {String} Name of the style as perceived by the geoserver
	 */
	update(layerName, style) {
		return superagent
			.post(this._url + '/rest/layers/' + layerName + '/styles')
			.auth(this._userName, this._password)
			.set('Accept', '*/*')
			.set('Content-Type', 'application/json; charset=utf-8')
			.send({
				style: {
					name: style
				}
			}).then(this.updateGwcCache.bind(this, layerName))
	}

	/**
	 * It allows generation of all the styles in the GWC cache.
	 * @param layerName {String} Name of the layer as perceived by geoserver and GWC.
	 */
	updateGwcCache(layerName) {
		return superagent
			.post(this._url + '/rest/layers/' + layerName + '/styles')
			.auth(this._userName, this._password)
			.set('Accept', '*/*')
			.set('Content-Type', 'application/json; charset=utf-8')
			.send({
				"GeoServerLayer": {
					"enabled": true,
					"metaWidthHeight": [4, 4],
					"name": layerName,
					"expireCache": 0,
					"expireClients": 0,
					"gridSubsets": [
						{"gridSetName": "EPSG:900913"},
						{"gridSetName": "EPSG:4326"}
					],
					"mimeFormats": [
						"image/jpeg",
						"image/png",
						"image/png8",
						"image/gif"
					],
					"parameterFilters": [{"defaultValue": "", "key": "STYLES"}],
					"gutter": 0
				}
			})
	}
}

module.exports = GeoServerLayerStyles;