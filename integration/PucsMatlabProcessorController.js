const hash = require('object-hash');
const _ = require('lodash');

const config = require('../config');

const CalculatePragueTemperatureMapUsingNeuralNetworkModel = require('../wps/processes/CalculatePragueTemperatureMapUsingNeuralNetworkModel');
const CalculateOstravaTemperatureMapUsingNeuralNetworkModel = require('../wps/processes/CalculateOstravaTemperatureMapUsingNeuralNetworkModel');
const FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
const PgRelations = require('../metadata/PgRelations');

const PgProcessStatus = require(`../integration/PgProcessStatus`);

class PucsMatlabProcessorController {
	constructor(app, pgPool, pgSchema, mongo) {
		app.post('/rest/pucs/execute_matlab', this.executeMatlabProcessor.bind(this));
		app.post('/rest/pucs/publish', this.publishMatlabResults.bind(this));

		this._mongo = mongo;

		this._pgProcessStatus = new PgProcessStatus(pgPool, pgSchema);

		this._pgRelations = new PgRelations(pgPool, pgSchema);
		this._calculatePragueTemperatureMapUsingNeuralNetworkModel = new CalculatePragueTemperatureMapUsingNeuralNetworkModel(pgPool, config.pantherTemporaryStoragePath, config.pantherDataStoragePath, pgSchema, mongo);
		this._calculateOstravaTemperatureMapUsingNeuralNetworkModel = new CalculateOstravaTemperatureMapUsingNeuralNetworkModel(pgPool, config.pantherTemporaryStoragePath, config.pantherDataStoragePath, pgSchema, mongo);
	}

	publishMatlabResults(request, response) {
		if (request.body.data) {
			this.processAll(request, this._pgProcessStatus)
				.then((results) => {
					response.status(200).send(
						{
							data: results,
							success: true
						}
					)
				})
				.catch((error) => {
					console.log(error);
					response.status(500).send(
						{
							message: error.message,
							success: false
						}
					)
				});
		} else {
			response.status(500).json({
				message: "no data",
				success: false
			})
		}
	}

	processAll(request, pgProcessStatus) {
		let promises = [];

		request.body.data.forEach((data) => {
			promises.push(
				this.processSingle(data, request.session.user, pgProcessStatus)
			)
		});

		return Promise.all(promises);
	}

	processSingle(input, user, pgProcessStatus) {
		return Promise.resolve()
			.then(() => {
				if (!input.uuid) {
					return _.assign(input, {message: "missing uuid", status: "error"})
				} else if (!input.data) {
					return _.assign(input, {message: "missing data", status: "error"})
				} else if (!input.data.scope_id) {
					return _.assign(input, {message: "missing scope id", status: "error"})
				} else {
					return this.ensureProcess(input, user, pgProcessStatus);
				}
			});
	}

	ensureProcess(input, user, pgProcessStatus) {
		return pgProcessStatus.getProcess(input.uuid)
			.then((pgProcess) => {
				if(pgProcess) {
					return pgProcess.data;
				} else {
					return this.startNewProcess(input, user, pgProcessStatus);
				}
			});
	}

	startNewProcess(input, user, pgProcessStatus) {
		return Promise.resolve()
			.then(() => {
				return pgProcessStatus.updateProcess(input.uuid, _.assign(input, {status: "running", progress: 0}));
			})
			.then(() => {
				this.prepareMatlabMetadata(input, user, pgProcessStatus);

				return pgProcessStatus.getProcess(input.uuid);
			})
	}

	prepareMatlabMetadata(input, user, pgProcessStatus) {
		return pgProcessStatus.getProcess(input.uuid)
			.then(async (pgProcess) => {
				let data = input.data;
				let scopeId = data.scope_id;
				let placeId = data.place_id;
				let type, identifier;

				if (input.data.uploadKey) {
					type = "uploadKey";
					identifier = input.data.uploadKey;
				} else if (input.data.remotePath) {
					type = "remotePath";
					identifier = input.data.remotePath;
				} else if (input.data.localLayer) {
					type = "localLayer";
					identifier = input.data.localLayer;
				}

				pgProcess.data.progress++;
				pgProcessStatus.updateProcess(input.uuid, pgProcess.data);

				let model;
				if (scopeId && placeId) {
					let scopeConfiguration = await this.getScopeConfiguration(scopeId);
					let pucsLandUseScenarios = scopeConfiguration['pucsLandUseScenarios'];
					if(pucsLandUseScenarios) {
						let processorByPlaceId = pucsLandUseScenarios['processorByPlaceId'];
						model = processorByPlaceId[placeId];
					}
				}

				if (type && identifier) {
					let matlabNetworkModelExec;
					switch (model) {
						case 'prague':
							matlabNetworkModelExec = this._calculatePragueTemperatureMapUsingNeuralNetworkModel.execute({
								dataInputs:
									[{
										identifier: 'inputFile',
										data: `${type}:${identifier}`
									}],
								owner: user
							});
							break;
						case 'ostrava':
							matlabNetworkModelExec = this._calculateOstravaTemperatureMapUsingNeuralNetworkModel.execute({
								dataInputs:
									[{
										identifier: 'inputFile',
										data: `${type}:${identifier}`
									}],
								owner: user
							});
							break;
					}

					if(matlabNetworkModelExec) {
						matlabNetworkModelExec.then((results) => {
							pgProcess.data.progress++;
							pgProcessStatus.updateProcess(input.uuid, pgProcess.data);

							let parsedResults = JSON.parse(results[0].data)[0];

							this.prepareSpatialRelationsOfMatlabResults(parsedResults, input, request);
						}).catch((error) => {
							console.log(`#### error`, error);

							pgProcess.data.status = 'error';
							pgProcess.data.message = error.message;

							pgProcessStatus.updateProcess(input.uuid, pgProcess.data);
						});
					} else {
						pgProcess.data.status = 'error';
						pgProcess.data.message = `unknown model type`;

						pgProcessStatus.updateProcess(input.uuid, pgProcess.data);
					}
				} else {
					pgProcess.data.status = 'error';
					pgProcess.data.message = `unknown input type or input identifier`;

					pgProcessStatus.updateProcess(input.uuid, pgProcess.data);
				}
			});
	}

	prepareSpatialRelationsOfMatlabResults(results, input, request) {
		return this.getScopeConfiguration(input.data.scope_id)
			.then((configuration) => {
				request.session.pucsMatlabProcesses[input.uuid].progress++;

				let templates = configuration.pucsLandUseScenarios.templates;

				let inputVectorDataSourceId = results.inputVectors[0].spatialDataSourceId;
				let inputVectorTemplateId = templates.sourceVector;

				let outputRasterUhi = _.find(results.outputRasters, {indicator: 'uhi'});
				let outputRasterUhiDataSourceId = outputRasterUhi ? outputRasterUhi.spatialDataSourceId : undefined;
				let outputRasterUhiTemplateId = templates.uhi;

				let outputRasterHwd = _.find(results.outputRasters, {indicator: 'hwd'});
				let outputRasterHwdDataSourceId = outputRasterHwd ? outputRasterHwd.spatialDataSourceId : undefined;
				let outputRasterHwdTemplateId = templates.hwd;

				let scopeId = input.data.scope_id;
				let periodId = input.data.period_id;
				let placeId = input.data.place_id;
				let scenarioId = input.data.scenario_id;

				if (
					inputVectorDataSourceId
					&& inputVectorTemplateId
					&& outputRasterHwdTemplateId
					&& outputRasterHwdDataSourceId
					&& outputRasterUhiTemplateId
					&& outputRasterUhiDataSourceId
				) {
					this.createSpatialRelationsOfMatlabResults(
						[
							{
								data: {
									scope_id: scopeId,
									period_id: periodId,
									place_id: placeId,
									data_source_id: inputVectorDataSourceId,
									layer_template_id: inputVectorTemplateId,
									scenario_id: scenarioId
								}
							},
							{
								data: {
									scope_id: scopeId,
									period_id: periodId,
									place_id: placeId,
									data_source_id: outputRasterUhiDataSourceId,
									layer_template_id: outputRasterUhiTemplateId,
									scenario_id: scenarioId
								}
							},
							{
								data: {
									scope_id: scopeId,
									period_id: periodId,
									place_id: placeId,
									data_source_id: outputRasterHwdDataSourceId,
									layer_template_id: outputRasterHwdTemplateId,
									scenario_id: scenarioId
								}
							}
						],
						input,
						request);
				} else {
					request.session.pucsMatlabProcesses[input.uuid].status = 'error';
					request.session.pucsMatlabProcesses[input.uuid].message = 'missing spatial relations data';
				}
			})
			.catch((error) => {
				console.log(error);
				request.session.pucsMatlabProcesses[input.uuid].status = 'error';
				request.session.pucsMatlabProcesses[input.uuid].message = error.message;
			});
	}

	createSpatialRelationsOfMatlabResults(spatialRelations, input, request) {
		this._pgRelations.create({spatial: spatialRelations}, request.session.user)
			.then(([results, errors]) => {
				request.session.pucsMatlabProcesses[input.uuid].progress++;
				request.session.pucsMatlabProcesses[input.uuid].status = "done";
				request.session.pucsMatlabProcesses[input.uuid].spatial_relations = results.spatial;
			})
			.catch((error) => {
				console.log(error);
				request.session.pucsMatlabProcesses[input.uuid].status = 'error';
				request.session.pucsMatlabProcesses[input.uuid].message = error.message;
			});
	}

	getScopeConfiguration(scopeId) {
		return new FilteredMongoScopes({_id: scopeId}, this._mongo).json()
			.then((mongoScopes) => {
				return mongoScopes[0].configuration;
			});
	}

	async executeMatlabProcessor(request, response) {
		if(!request.session.pucsMatlabProcesses) {
			request.session.pucsMatlabProcesses = {};
		}

		if (request.body.data) {
			let uploadKey = request.body.data.uploadKey;
			let remotePath = request.body.data.remotePath;
			let localLayer = request.body.data.localLayer;
			let processKey = hash(uploadKey || remotePath || localLayer);
			let placeId = request.body.data.placeId;
			let scopeId = request.body.data.scopeId;

			let processorPlace;
			if (scopeId && placeId) {
				let scopeConfiguration = await this.getScopeConfiguration(scopeId);
				let pucsLandUseScenarios = scopeConfiguration['pucsLandUseScenarios'];
				if(pucsLandUseScenarios) {
					let processorByPlaceId = pucsLandUseScenarios['processorByPlaceId'];
					processorPlace = processorByPlaceId[placeId];
				}
			}

			if (uploadKey || remotePath || localLayer) {
				if (!request.session.pucsMatlabProcesses[processKey]) {
					request.session.pucsMatlabProcesses[processKey] = {
						status: "running"
					};

					let type, identifier;
					if (uploadKey) {
						type = "uploadKey";
						identifier = uploadKey;
					} else if (remotePath) {
						type = "remotePath";
						identifier = remotePath;
					} else if (localLayer) {
						type = "localLayer";
						identifier = localLayer;
					}

					let matlabProcess;
					switch (processorPlace) {
						case 'prague':
							matlabProcess = this._calculatePragueTemperatureMapUsingNeuralNetworkModel.execute({
								dataInputs:
									[{
										identifier: 'inputFile',
										data: `${type}:${identifier}`
									}],
								owner: request.session.user
							});
							break;
						case 'ostrava':
							matlabProcess = this._calculateOstravaTemperatureMapUsingNeuralNetworkModel.execute({
								dataInputs:
									[{
										identifier: 'inputFile',
										data: `${type}:${identifier}`
									}],
								owner: request.session.user
							});
							break;
						default:
							matlabProcess = Promise.reject(new Error('Unable to find processor for this place'));
					}

					matlabProcess.then((result) => {
						request.session.pucsMatlabProcesses[processKey] = {
							status: "done",
							result: result[0].data
						};
					}).catch((error) => {
						console.log(error);
						request.session.pucsMatlabProcesses[processKey] = {
							status: "error",
							message: error.message
						}
					});
				}
				if (request.session.pucsMatlabProcesses[processKey]['status'] === "error") {
					response.status(500).json({
						message: request.session.pucsMatlabProcesses[processKey]['message'],
						success: false
					});
				} else {
					response.status(200).json(request.session.pucsMatlabProcesses[processKey]);
				}
			} else {
				response.status(500).json({
					message: "missing uploadKey, remotePath or localLayer",
					success: false
				})
			}
		} else {
			response.status(500).json({
				message: "no data",
				success: false
			})
		}
	}
}


module.exports = PucsMatlabProcessorController;