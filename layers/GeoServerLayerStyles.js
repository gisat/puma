var superagent = require('superagent');

/**
 * It stores the information about the combination of layer and style.
 */
class GeoServerLayerStyles {
	constructor(url, userName, password){
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
			})
	}
}

module.exports = GeoServerLayerStyles;