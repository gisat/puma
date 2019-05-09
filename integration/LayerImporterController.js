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
		this._layerImporterTasks = new LayerImporterTasks(pgPool, schema);
		this._layerImporter = new LayerImporter(pgPool, mongo, this._layerImporterTasks, schema);
		this._uploadManager = new UploadManager(pgPool, schema, `${pantherDataStoragePath}/upload_manager/uploads`);
		this._pgProcessStatus = new PgProcessStatus(pgPool, schema);
	}

	async duplicateLayer(request, response) {
		let duplicates = request.body.data;
		if (duplicates) {
			duplicates = _.isArray(duplicates) ? duplicates : [duplicates];

			let responseData = [];

			for(let duplicate of duplicates) {
				let uuid = duplicate.uuid;
				let data = duplicate.data;

				if(uuid) {
					let processData = {
						uuid: uuid,
						data: data,
						status: 'running',
						progress: 0
					};

					await this._pgProcessStatus
						.getProcess(uuid)
						.then((lrprocess) => {
							if(!lrprocess) {
								return this._pgProcessStatus
									.updateProcess(uuid, processData)
									.then(() => {
										new DataLayerDuplicator().duplicateLayer(uuid, this._pgProcessStatus);
										responseData.push(processData);
									})
							} else {
								responseData.push(lrprocess.data)
							}
						});
				} else {
					responseData.push({
						data: data,
						status: "error",
						progress: 0,
						message: "missing uuid"
					})
				}
			}

			response.status(200).json({data: responseData, success: true});
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
		this._layerImporterTasks.getImporterTask(request.params['id']).then(task => {
			response.send(task);
		});
	}

	/**
	 * Execute import of new layer
	 * @param request
	 * @param response
	 */
	importLayer(request, response) {
		logger.info('LayerImporterController#importLayer');

		let inputs;
		this.getImportInputs(request).then(pInputs => {
			inputs = pInputs;
			return this._layerImporterTasks.createNewImportTask();
		}).then(task => {
			this._layerImporter.importLayer(task, inputs);
			response.send(task);
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

		let inputs;
		this.getImportInputs(request).then(pInputs => {
			inputs = pInputs;
			return this._layerImporterTasks.createNewImportTask();
		}).then(task => {
			this._layerImporter.importLayerWithoutStatistics(task, inputs);
			response.send(task);
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

		let inputs;
		this.getImportInputs(request).then(pInputs => {
			inputs = pInputs;
			return this._layerImporterTasks.createNewImportTask();
		}).then(task => {
			this._layerImporter.importLayerWithoutMapping(task, inputs);
			response.send(task);
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