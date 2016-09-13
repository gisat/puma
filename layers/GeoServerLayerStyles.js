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
			.post(this._url + '/gwc/rest/layers/' + layerName + '.xml')
			.auth(this._userName, this._password)
			.set('Accept', '*/*')
			.set('Content-Type', 'application/xml; charset=utf-8')
			.send('<?xml version="1.0" encoding="UTF-8"?><GeoServerLayer><enabled>true</enabled><name>' + layerName+'</name><mimeFormats><string>image/jpeg</string><string>image/png</string><string>image/png8</string><string>image/gif</string></mimeFormats><gridSubsets><gridSubset><gridSetName>EPSG:900913</gridSetName></gridSubset><gridSubset><gridSetName>EPSG:4326</gridSetName></gridSubset></gridSubsets><metaWidthHeight><int>4</int><int>4</int></metaWidthHeight><expireCache>0</expireCache><expireClients>0</expireClients><parameterFilters><styleParameterFilter><key>STYLES</key><defaultValue></defaultValue></styleParameterFilter></parameterFilters><gutter>0</gutter></GeoServerLayer>')
	}
}

module.exports = GeoServerLayerStyles;