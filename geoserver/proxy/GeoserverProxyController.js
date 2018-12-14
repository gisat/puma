const GeoserverProxy = require(`./GeoserverProxy`);

class GeoserverProxyController {
	constructor(app, pgPool, pgSchema, mongo) {
		app.get(`/geoserver*`, this.proxy.bind(this));
		app.post(`/geoserver*`, this.proxy.bind(this));
		app.put(`/geoserver*`, this.proxy.bind(this));
		app.delete(`/geoserver*`, this.proxy.bind(this));

		this._geoserverProxy = new GeoserverProxy(pgPool, pgSchema, mongo);
	}

	proxy(request, response) {
		this._geoserverProxy.proxy(request, response);
	}
}

module.exports = GeoserverProxyController;