const hash = require('object-hash');
const _ = require('lodash');

const config = require('../config');

const CalculatePragueTemperatureMapUsingNeuralNetworkModel = require('../wps/processes/CalculatePragueTemperatureMapUsingNeuralNetworkModel');
const CalculateOstravaTemperatureMapUsingNeuralNetworkModel = require('../wps/processes/CalculateOstravaTemperatureMapUsingNeuralNetworkModel');
const FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
const PgRelations = require('../metadata/PgRelations');

let processes = {};

class PucsMatlabProcessorController {
	constructor(app, pgPool, pgSchema, mongo) {
		app.post('/rest/pucs/execute_matlab', this.executeMatlabProcessor.bind(this));
		app.post('/rest/pucs/publish', this.publishMatlabResults.bind(this));

		this._mongo = mongo;

		this._pgRelations = new PgRelations(pgPool, pgSchema);
		this._calculatePragueTemperatureMapUsingNeuralNetworkModel = new CalculatePragueTemperatureMapUsingNeuralNetworkModel(pgPool, config.pantherTemporaryStoragePath, config.pantherDataStoragePath, pgSchema, mongo);
		this._calculateOstravaTemperatureMapUsingNeuralNetworkModel = new CalculateOstravaTemperatureMapUsingNeuralNetworkModel(pgPool, config.pantherTemporaryStoragePath, config.pantherDataStoragePath, pgSchema, mongo);
	}

	publishMatlabResults(request, response) {
		if (request.body.data) {
			this.processAll(request.body.data, request.session.user)
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

	processAll(input, user) {
		let promises = [];

		input.forEach((data) => {
			promises.push(
				this.processSingle(data, user)
			)
		});

		return Promise.all(promises);
	}

	processSingle(input, user) {
		return Promise.resolve()
			.then(() => {
				if (!input.uuid) {
					return _.assign(input, {message: "missing uuid", status: "error"})
				} else if (!input.data) {
					return _.assign(input, {message: "missing data", status: "error"})
				} else if (!input.data.scope_id) {
					return _.assign(input, {message: "missing scope id", status: "error"})
				} else {
					return this.ensureProcess(input, user);
				}
			});
	}

	ensureProcess(input, user) {
		return Promise.resolve()
			.then(() => {
				if (processes.hasOwnProperty(input.uuid)) {
					return processes[input.uuid];
				} else {
					return this.startNewProcess(input, user);
				}
			});
	}

	startNewProcess(input, user) {
		return Promise.resolve()
			.then(() => {
				processes[input.uuid] = _.assign(input, {status: "running", progress: 0});

				this.prepareMatlabMetadata(input, user);

				return processes[input.uuid];
			});
	}

	prepareMatlabMetadata(input, user) {
		return Promise.resolve()
			.then(async () => {
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

				processes[input.uuid].progress++;

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
							processes[input.uuid].progress++;

							let parsedResults = JSON.parse(results[0].data)[0];

							this.prepareSpatialRelationsOfMatlabResults(parsedResults, input, user);
						}).catch((error) => {
							console.log(`#### error`, error);
							processes[input.uuid].status = 'error';
							processes[input.uuid].message = error.message;
						});
					} else {
						processes[input.uuid].status = 'error';
						processes[input.uuid].message = `unknown model type`;
					}
				} else {
					processes[input.uuid] = _.assign(input, {
						message: "unknown input type or input identifier",
						status: "error"
					})
				}
			});
	}

	prepareSpatialRelationsOfMatlabResults(results, input, user) {
		return this.getScopeConfiguration(input.data.scope_id)
			.then((configuration) => {
				processes[input.uuid].progress++;

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
						user);
				} else {
					processes[input.uuid].status = 'error';
					processes[input.uuid].message = 'missing spatial relations data';
				}
			})
			.catch((error) => {
				console.log(error);
				processes[input.uuid].status = 'error';
				processes[input.uuid].message = error.message;
			});
	}

	createSpatialRelationsOfMatlabResults(spatialRelations, input, user) {
		this._pgRelations.create({spatial: spatialRelations}, user)
			.then(([results, errors]) => {
				processes[input.uuid].progress++;
				processes[input.uuid].status = "done";
				processes[input.uuid].spatial_relations = results.spatial;
			})
			.catch((error) => {
				console.log(error);
				processes[input.uuid].status = 'error';
				processes[input.uuid].message = error.message;
			});
	}

	getScopeConfiguration(scopeId) {
		return new FilteredMongoScopes({_id: scopeId}, this._mongo).json()
			.then((mongoScopes) => {
				return mongoScopes[0].configuration;
			});
	}

	async executeMatlabProcessor(request, response) {
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
				if (!processes[processKey]) {
					processes[processKey] = {
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
						processes[processKey] = {
							status: "done",
							result: result[0].data
						};
					}).catch((error) => {
						console.log(error);
						processes[processKey] = {
							status: "error",
							message: error.message
						}
					});
				}
				if (processes[processKey]['status'] === "error") {
					response.status(500).json({
						message: processes[processKey]['message'],
						success: false
					});
				} else {
					response.status(200).json(processes[processKey]);
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