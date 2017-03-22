let Promise = require('promise');

let config = require('../config');
let conn = require('../common/conn');
let logger = require('../common/Logger').applicationWideLogger;

let FilteredMongoLayerGroups = require('./FilteredMongoLayerGroups');
let FrontOfficeLayers = require('./FrontOfficeLayers');
let GeonodeLayers = require('./GeonodeLayers');
let MongoLayerReferences = require('./MongoLayerReferences');
let PgLayers = require('./PgLayers');
let PgPermissions = require('../security/PgPermissions');
let Permission = require('../security/Permission');

/**
 * This controller represents layers where source of the data is in the geonode and therefore also geoserver.
 * The application will support other types of the layers as well.
 */
class LayerGeonodeController {
	constructor(app, pgPool, schema) {
		this.mongo = conn.getMongoDb();

		this.pgLayers = new PgLayers(pgPool, this.mongo, schema || config.postgreSqlSchema);
		this.permissions = new PgPermissions(pgPool, schema || config.postgreSqlSchema);

		this.layerReferences = new FrontOfficeLayers(this.mongo);

		app.get('/rest/layer', this.readAll.bind(this));
		app.post('/rest/layer', this.add.bind(this));
		app.put('/rest/layer', this.update.bind(this));
		app.delete('/rest/layer/:id', this.delete.bind(this));
		app.get('/rest/filtered/layer', this.getFiltered.bind(this));
	}

	/**
	 * It returns all layers available for the user. It takes into account all storages for layers not only geonode.
	 * @param request
	 * @param response
	 */
	readAll(request, response) {
		logger.info('LayerGeonodeController#readAl Read all layers By User: ', request.session.userId);

		let currentUser = request.session.user;
		let geonode = new GeonodeLayers(response.locals.ssid, config.geonodeUrl, this.mongo);
		let layers = [];
		// Load actually accessible from the GeoNode
		geonode.all().then(geoNodeLayers => {
			logger.info(`LayerController#readAll GeoNode Loaded: ${geoNodeLayers.length}`);
			// Name and path needs to be returned. For the ones from geonode it will be the same. For the ones in pg it can differ.
			layers = layers.concat(geoNodeLayers);
			return this.pgLayers.all();
		}).then(pgLayers => {
			pgLayers = pgLayers.filter(layer => currentUser.hasPermission("layer", Permission.READ, layer.id));
			layers = layers.concat(pgLayers);

			return this.permissions.forTypeCollection("layer", layers);
		}).then(() => {
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
			logger.error(`LayerGeonodeController#add User: ${request.session.userId} doesn't have permissions to create layer.`);
			response.status(403).json({status: "err"});
			return;
		}

		let created;
		this.pgLayers.add(request.body.name, request.body.path, request.session.user.id).then(pCreated => {
			created = pCreated;
			return Promise.all([
				this.permissions.add(request.session.userId, 'layer', created.id, Permission.READ),
				this.permissions.add(request.session.userId, 'layer', created.id, Permission.UPDATE),
				this.permissions.add(request.session.userId, 'layer', created.id, Permission.DELETE)
			]);
		}).then(() => {
			response.json({data: created, status: "Ok"});
		}).catch(error => {
			logger.error('LayerGeonodeController#add Error: ', error);
			response.status(500).json({status: "err"});
		})
	}

	/**
	 * It updates layer which is passed in the body.
	 * @param request
	 * @param response
	 */
	update(request, response) {
		logger.info(`LayerController#update Update layer: ${request.body} By User: ${request.session.userId} `);

		if (!request.session.user.hasPermission('layer', Permission.UPDATE, request.body.id)) {
			logger.error(`LayerGeonodeController#update User: ${request.session.userId} doesn't have permissions to update layer. ${request.body.id}`);
			response.status(403).json({status: "err"});
			return;
		}

		this.pgLayers.update(request.body.id, request.body.name, request.body.path, request.session.user.id).then(pUpdated => {
			response.json({data: pUpdated, status: "Ok"});
		}).catch(error => {
			logger.error('LayerGeonodeController#update Error: ', error);
			response.status(500).json({status: "err"});
		});
	}

	/**
	 * It deletes one of the layers which were created as duplication of GeonodeLayers. This method can't delete layers
	 * that are part of the geonode.
	 * @param request
	 * @param response
	 */
	delete(request, response) {
		logger.info(`LayerGeonodeController#delete Delete layer with id: ${request.params.id} By User: ${request.session.userId} `);

		if (!request.session.user.hasPermission('layer', Permission.DELETE, request.params.id)) {
			logger.error(`LayerGeonodeController#add User: ${request.session.userId} doesn't have permissions to delete layer: ${request.params.id}`);
			response.status(403).json({status: "err"});
			return;
		}

		this.pgLayers.delete(request.params.id).then(() => {
			response.json({status: "Ok"});
		}).catch(error => {
			logger.error('LayerGeonodeController#delete Error: ', error);
			response.status(500).json({status: "err"});
		})
	}

	/**
	 * It returns filtered layers available in the system. The returned information contains: path, name, layerGroup
	 * The filters that are supported are:
	 * {
	 *   scope: {idOfScope},
	 *   year: [{idOfFirstYear}, {idOfSecondYear}]
	 *   place: [] or nothing, if there is no place filter, then layers for all places
	 * }
	 */
	getFiltered(request, response) {
		logger.info(`LayerGeonodeController#getFiltered Get filtered layers for scope: ${request.body.scope}, theme: ${request.body.theme}, years: ${request.body.year}, place: ${request.body.place} by  User: ${request.session.userId}`);

		if (!request.session.user.hasPermission('scope', Permission.READ, request.body.scope)) {
			logger.error(`LayerGeonodeController#getFiltered User: ${request.session.userId} doesn't have permissions to read layers for give scope: ${request.body.scope}`);
			response.status(403).json({status: "err"});
			return;
		}

		this.layerReferences.withAreaTemplateNameAndLayerGroup(request.body.scope, request.body.year, request.body.place).then(layers => {
			response.json({data: layers});
		}).catch(error => {
			logger.error('LayerGeonodeController#getFiltered Error: ', error);
			response.status(500).json({status: 'err'});
		});
	}
}

module.exports = LayerGeonodeController;