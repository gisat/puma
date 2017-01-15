let Promise = require('promise');

let config = require('../config');
let conn = require('../common/conn');
let logger = require('../common/Logger').applicationWideLogger;

let GeonodeLayers = require('./GeonodeLayers');
let PgLayers = require('./PgLayers');
let PgPermissions = require('../security/PgPermissions');
let Permission = require('../security/Permission');

	/**
 * This controller represents layers where source of the data is in the geonode and therefore also geoserver.
 * The application will support other types of the layers as well.
 */
class LayerGeonodeController {
	constructor(app, pgPool) {
		this.mongo = conn.getMongoDb();

		this.pgLayers = new PgLayers(pgPool, this.mongo, config.postgreSqlSchema);
		this.permissions = new PgPermissions(pgPool, config.postgreSqlSchema);

		app.get('/rest/layer', this.readAll.bind(this));
		app.post('/rest/layer', this.add.bind(this));
		app.delete('/rest/layer/:id', this.delete.bind(this));
	}

	/**
	 * It returns all layers available for the user. It takes into account all storages for layers not only geonode.
	 * @param request
	 * @param response
	 * @param next
	 */
	readAll(request, response, next) {
		logger.info('LayerGeonodeController#readAl Read all layers By User: ', request.session.userId);

		let currentUser = request.session.user;
		let geonode = new GeonodeLayers(response.locals.ssid, config.geonodeUrl, this.mongo);
		let layers = [];
		// Load actually accessible from the GeoNode
		geonode.all().then(geonodeLayers => {
			// Name and path needs to be returned. For the ones from geonode it will be the same. For the ones in pg it can differ.
			layers = layers.concat(geonodeLayers);
			return this.pgLayers.all();
		}).then(pgLayers => {
			layers = layers.concat(pgLayers);
			layers = layers.filter(layer => currentUser.hasPermission("layer", Permission.READ, layer.id));

			response.json({data: layers});
		}).catch(err => {
			logger.error('LayerGeonodeController#readAll Error: ', err);
			response.status(500).json({status: "err"});
		});
	}

	/**
	 * It adds new layer into the postgreSql storage. It also add rights to update and delete the layer to the user who created the layer.
	 * @param request
	 * @param response
	 */
	add(request, response) {
		logger.info(`LayerController#add Add new layer: ${request.body} By User: ${request.session.userId} `);

		if (!request.session.user.hasPermission('layer', Permission.CREATE, null)) {
			response.status(403);
			return;
		}

		let created;
		this.pgLayers.add(request.body.name, request.body.path, request.session.user.id).then(pCreated => {
			created = pCreated;
			return Promise.all([
				this.permissions.add(request.session.userId, 'layer', created.id, "GET"),
				this.permissions.add(request.session.userId, 'layer', created.id, "PUT"),
				this.permissions.add(request.session.userId, 'layer', created.id, "DELETE")
			]);
		}).then(() => {
			response.json({data: created, status: "Ok"});
		}).catch(error => {
			logger.error('LayerGeonodeController#add Error: ', error);
			response.status(500).json({status: "err"});
		})
	}

	delete(request, response) {
		logger.info(`LayerGeonodeController#delete Delete layer with id: ${request.params.id} By User: ${request.session.userId} `);

		if (!request.session.user.hasPermission('layer', Permission.DELETE, null)) {
			response.status(403);
			return;
		}

		this.pgLayers.delete(request.body.name, request.body.path, request.session.user.id).then(() => {
			response.json({status: "Ok"});
		}).catch(error => {
			logger.error('LayerGeonodeController#delete Error: ', error);
			response.status(500).json({status: "err"});
		})
	}
}

module.exports = LayerGeonodeController;