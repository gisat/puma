const _ = require('lodash');

let logger = require('../common/Logger').applicationWideLogger;

let LayerImporterTasks = require('./LayerImporterTasks');
let LayerImporter = require('./LayerImporter');

const PgProcessStatus = require(`../integration/PgProcessStatus`);

const UploadManager = require(`../integration/UploadManager`);
const DataLayerDuplicator = require('../layers/DataLayerDuplicator')

class LayerImporterController {
	constructor(app, mongo, pgPool, schema, pantherDataStoragePath) {
		app.get('/rest/layerImporter/status/:id', this.getLayerImportStatus.bind(this));
		app.post('/rest/layerImporter/import', this.importLayer.bind(this));
		app.post('/rest/layerImporter/importNoStatistics', this.importNoStatisticsLayer.bind(this));
		app.post('/rest/importer/layer', this.importLayerWithoutMapping.bind(this));
		app.post('/rest/importer/upload', this.upload.bind(this));
		app.post('/rest/importer/duplicate', this.duplicateLayer.bind(this));

		this._mongo = mongo;
		this._pgPool = pgPool;
		this._layerImporterTasks = new LayerImporterTasks();
		this._layerImporter = new LayerImporter(pgPool, mongo, this._layerImporterTasks, schema);
		this._uploadManager = new UploadManager(pgPool, schema, `${pantherDataStoragePath}/upload_manager/uploads`);
		this._pgProcessStatus = new PgProcessStatus(pgPool, schema);
	}

	duplicateLayer(request, response) {
		let duplicates = request.body.data;
		if (duplicates) {
			duplicates = _.isArray(duplicates) ? duplicates : [duplicates];

			response.status(200).json({
				data: _.map(duplicates, (duplicate) => {
					let uuid = duplicate.uuid;
					let data = duplicate.data;

					if(uuid) {
						return this._pgProcessStatus
							.getProcess(uuid)
							.then((lrprocess) => {
								if(!lrprocess) {
									let processData = {
										uuid: uuid,
										data: data,
										status: 'running',
										progress: 0
									};

									return this._pgProcessStatus
										.updateProcess(uuid, processData)
										.then(() => {
											new DataLayerDuplicator().duplicateLayer(uuid, this._pgProcessStatus);
											return processData;
										})
								} else {
									return lrprocess;
								}
							});
					} else {
						return {
							data: data,
							status: "error",
							progress: 0,
							message: "missing uuid"
						}
					}
				}),
				success: true
			});
		} else {
			response
				.status(500)
				.json(
					{
						message: `Nothing to duplicate`,
						success: false
					}
				);
		}
	}

	/**
	 * Return status of layer import
	 * @param request
	 * @param response
	 */
	getLayerImportStatus(request, response) {
		response.send(this._layerImporterTasks.getImporterTask(request.params['id']));
	}

	/**
	 * Execute import of new layer
	 * @param request
	 * @param response
	 */
	importLayer(request, response) {
		logger.info('LayerImporterController#importLayer');

		this.getImportInputs(request).then(inputs => {
			this._layerImporter.importLayer(inputs);
			response.send(this._layerImporter.getCurrentImporterTask());
		}).catch(error => {
			response.send({
				message: error.message,
				success: false
			})
		});
	}

	/**
	 * Execute import of the layer without generating statistics for it.
	 * @param request
	 * @param response
	 */
	importNoStatisticsLayer(request, response) {
		logger.info('LayerImporterController#importNoStatisticsLayer');

		this.getImportInputs(request).then(inputs => {
			this._layerImporter.importLayerWithoutStatistics(inputs);
			response.send(this._layerImporter.getCurrentImporterTask());
		}).catch(error => {
			response.send({
				message: error.message,
				success: false
			})
		});
	}

	/**
	 * Execute import of the layer without statistics and mapping of the layer. It is useful mainly for uploading the layers
	 * which should be used as analytical units.
	 * @param request
	 * @param response
	 */
	importLayerWithoutMapping(request, response) {
		logger.info('LayerImporterController#importLayerWithoutMapping Body: ', request.body);

		this.getImportInputs(request).then(inputs => {
			this._layerImporter.importLayerWithoutMapping(inputs);
			response.send(this._layerImporter.getCurrentImporterTask());
		}).catch(error => {
			response.send({
				message: error.message,
				success: false
			})
		});
	}

	/**
	 * Just upload file (vector, raster etc) and store it in filesystem.
	 * @param request
	 * @param response
	 */
	upload(request, response) {
		this.getUploadInputs(request)
			.then((uploadInputs) => {
				return this._uploadManager.add(uploadInputs);
			})
			.then((metadata) => {
				response.status(200).json({
					data: metadata,
					success: true
				});
			})
			.catch((error) => {
				response.status(500).json({
					message: error.message,
					success: false
				})
			})
	}

	/**
	 * Return parsed upload inputs from request
	 * @param request
	 */
	getUploadInputs(request) {
		return Promise.resolve().then(() => {
			return {
				path: request.files.file.path,
				name: request.files.file.originalFilename || request.files.file.name,
				customName: request.body.name,
				user: {
					id: request.session.user.id
				}
			}
		});
	}

	/**
	 * Return parsed import inputs from request
	 * @param request
	 */
	getImportInputs(request) {
		return Promise.resolve().then(() => {
			return {
				scope: request.body.scope,
				theme: request.body.theme,
				url: request.body.url,
				file: request.files.file.path,
				name: request.files.file.originalFilename || request.files.file.name,
				customName: request.body.name,
				user: {
					id: request.session.user.id
				}
			}
		});
	}
}

module.exports = LayerImporterController;