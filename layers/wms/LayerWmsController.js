let logger = require('../../common/Logger').applicationWideLogger;

let PgWmsLayers = require('./PgWmsLayers');
let Permission = require('../../security/Permission');

/**
 * This controller handles layers represented purely as WMS. This basically means that only URL and the name of the layer
 * is supplied.
 */
class LayerWmsController {
	constructor(app, pool){
		this._pgLayers = new PgWmsLayers(pool);

		app.get('/rest/wms/layer', this.readAll.bind(this));
		app.post('/rest/wms/layer', this.add.bind(this));
		app.delete('/rest/wms/layer/:id', this.delete.bind(this));
	}

	/**
	 * It reads all WMS layers stored in the database. By stored in the database I mean the metadata that are stored in
	 * the database. The WMS layers themselves aren't in the database.
	 * @param request
	 * @param response
	 */
	readAll(request, response) {
		logger.info('LayerWmsController#readAll Read all layers By User: ', request.session.userId);

		let currentUser = request.session.user;
		// Load actually accessible from the GeoNode
		return this._pgLayers.all().then(pgLayers => {
			let layers = pgLayers.filter(layer => currentUser.hasPermission("layer_wms", Permission.READ, layer.id));

			response.json({data: layers});
		}).catch(err => {
			logger.error('LayerGeonodeController#readAll Error: ', err);
			response.status(500).json({status: "err"});
		});
	}

	/**
	 * It adds the metadata for new WMS layer in the database.
	 * @param request
	 * @param response
	 */
	add(request, response) {
		logger.info(`LayerWmsController#add Create new layer: ${request.body.name} url: ${request.body.url} By User: ${request.session.userId}`);

		if (!request.session.user.hasPermission('layer_wms', Permission.CREATE, null)) {
			response.status(403);
			response.json({"status": "err"});
			return;
		}


		let currentUser = request.session.user;
		return this._pgLayers.add(request.body.name, request.body.path, currentUser.id).then(pgLayer => {
			response.json({data: pgLayer});
		}).catch(err => {
			logger.error('LayerWmsController#add Error: ', err);
			response.status(500).json({status: "err"});
		});
	}

	/**
	 * It removes details about the WMS layer with given id from the persistent storage.
	 * @param request
	 * @param response
	 */
	delete(request, response) {
		logger.info(`LayerWmsController#add Delete layer: ${request.params.id} By User: ${request.session.userId}`);

		if (!request.session.user.hasPermission('layer_wms', Permission.CREATE, request.params.id)) {
			response.status(403);
			response.json({"status": "err"});
			return;
		}


		return this._pgLayers.delete(request.params.id).then(() => {
			response.json({"status": "Ok"});
		}).catch(err => {
			logger.error('LayerWmsController#add Error: ', err);
			response.status(500).json({status: "err"});
		});
	}
}

module.exports = LayerWmsController;