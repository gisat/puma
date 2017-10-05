let Promise = require('promise');

let logger = require('../../common/Logger').applicationWideLogger;
let config = require('../../config');
let conn = require('../../common/conn');

let PgWmsLayers = require('./PgWmsLayers');
let PgPermissions = require('../../security/PgPermissions');
let Permission = require('../../security/Permission');

/**
 * This controller handles layers represented purely as WMS. This basically means that only URL and the name of the layer
 * is supplied.
 */
class LayerWmsController {
	constructor(app, pool, mongo, schema){
		this._pgLayers = new PgWmsLayers(pool, mongo, schema || config.postgreSqlSchema);
		this.permissions = new PgPermissions(pool, schema || config.postgreSqlSchema);
		this.type = "layer";

		app.get('/rest/wms/layer', this.readAll.bind(this));
		app.post('/rest/wms/layer', this.add.bind(this));
		app.put('/rest/wms/layer', this.update.bind(this));
		app.delete('/rest/wms/layer/:id', this.delete.bind(this));
	}

	/**
	 * It reads all WMS layers stored in the database. By stored in the database I mean the metadata that are stored in
	 * the database. The WMS layers themselves aren't in the database.
	 * @param request
	 * @param response
	 */
	readAll(request, response) {
		logger.info('LayerWmsController#readAll Read all layers By User: ', request.session.userId, 'With params: ', request.query);

		let currentUser = request.session.user;
		let layers;
		// Load actually accessible from the GeoNode
		return this._pgLayers.filtered(request.query.scope, request.query.place, request.query.periods).then(pgLayers => {
			layers = pgLayers.filter(layer => currentUser.hasPermission(this.type, Permission.READ, layer.id));

			let promises = layers.map(layer => {
				return this.permissions.forType("layer", layer.id).then(permissions => {
					layer.permissions = permissions;
				});
			});

			return Promise.all(promises)
		}).then(() => {
			response.json({data: layers});
		}).catch(err => {
			logger.error('LayerWmsController#readAll Error: ', err);
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

		if (!request.session.user.hasPermission(this.type, Permission.CREATE, null)) {
			logger.error(`LayerWmsController#add User: ${request.session.userId} doesnt have permissions to create WMS layer`);
			response.status(403).json({"status": "err"});
			return;
		}
		this.defaultsForLayer(request.body);

		let currentUser = request.session.user;
		let layer;
		return this._pgLayers.add(request.body, currentUser.id).then(pgLayer => {
			layer = pgLayer;

			return Promise.all([
				this.permissions.add(currentUser.id, this.type, pgLayer.id, Permission.READ),
				this.permissions.add(currentUser.id, this.type, pgLayer.id, Permission.UPDATE),
				this.permissions.add(currentUser.id, this.type, pgLayer.id, Permission.DELETE)
			]);
		}).then(() => {
			response.json({data: layer});
		}).catch(err => {
			logger.error('LayerWmsController#add Error: ', err);
			response.status(500).json({status: "err"});
		});
	}

	/**
	 * It supplies default values for the layer instead of stuff such as undefined.
	 * @param layer
	 */
	defaultsForLayer(layer) {
		layer.name = layer.name || '';
		layer.url = layer.url || '';
		layer.layer = layer.layer || '';

	}

	/**
	 * It updates the WMS layer with given details.
	 * @param request
	 * @param response
	 */
	update(request, response) {
		logger.info(`LayerWmsController#update Update Layer: ${request.body.id} By User: ${request.session.userId}`);

		let layerToUpdate = request.body;
		if (!request.session.user.hasPermission(this.type, Permission.UPDATE, layerToUpdate.id)) {
			logger.error(`LayerWmsController#update User: ${request.session.userId} doesnt have permissions to update WMS layer: ${request.body.id}`);
			response.status(403).json({"status": "err"});
			return;
		}

		let currentUser = request.session.user;
		return this._pgLayers.update(layerToUpdate, currentUser.id).then(pgLayer => {
			response.json({data: pgLayer});
		}).catch(err => {
			logger.error(`LayerWmsController#update Error: `, err);
			response.status(500).json({status: "err"});
		})
	}

	/**
	 * It removes details about the WMS layer with given id from the persistent storage.
	 * @param request
	 * @param response
	 */
	delete(request, response) {
		logger.info(`LayerWmsController#add Delete layer: ${request.params.id} By User: ${request.session.userId}`);

		if (!request.session.user.hasPermission(this.type, Permission.DELETE, request.params.id)) {
			logger.error(`LayerWmsController#delete User: ${request.session.userId} doesnt have permissions to update WMS layer: ${request.params.id}`);
			response.status(403).json({"status": "err"});
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