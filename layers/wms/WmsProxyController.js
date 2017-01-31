let superagent = require('superagent');

let logger = require('../../common/Logger').applicationWideLogger;
let proxy = require('../../api/proxy');

const LAYER_TYPE = {
	WMS_CUSTOM: 'wms_custom',
	CHOROPLETH: 'choropleth'
};

/**
 * This controller works as a provider for WMS based image data. It receives the WMS layer it should use and retrieve
 * the image from the source WMS and serves it to the client. This way we will be able to work with the WMS without CORS.
 * At some point in future this should be either accompanied by GWC or replaced.
 */
class WmsProxyController {
	constructor(app) {
		app.get('/rest/wms/proxy', this.server.bind(this));
	}

	/**
	 *
	 * @param request
	 * @param response
	 * @param next
	 */
	serve(request, response, next) {
		let parameters = request.query;
		if(parameters.type != LAYER_TYPE.WMS_CUSTOM && parameters.type != LAYER_TYPE.CHOROPLETH) {
			proxy.wms(parameters, request, response, (error) => {
				if (error) {
					logger.error(`WmsProxyController#serve Error: `, error);
					next(error);
				}
			})
		} else {
			// Create WMSSource for the images.
			superagent
				.get('')
				.auth()
		}
	}
}

module.exports = WmsProxyController;