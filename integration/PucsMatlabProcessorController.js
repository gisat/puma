const hash = require('object-hash');

const config = require('../config');

const CalculatePragueTemperatureMapUsingNeuralNetworkModel = require('../wps/processes/CalculatePragueTemperatureMapUsingNeuralNetworkModel');

let processes = {};

class PucsMatlabProcessorController {
	constructor(app, pgPool, pgSchema, mongo) {
		app.post('/rest/pucs/execute_matlab', this.executeMatlabProcessor.bind(this));

		this._calculatePragueTemperatureMapUsingNeuralNetworkModel = new CalculatePragueTemperatureMapUsingNeuralNetworkModel(pgPool, processes, config.pantherTemporaryStoragePath, config.pantherDataStoragePath, pgSchema, mongo);
	}

	executeMatlabProcessor(request, response) {
		if(request.body.data) {
			let uploadKey = request.body.data.uploadKey;
			let remotePath = request.body.data.remotePath;
			let localLayer = request.body.data.localLayer;
			let processKey = hash(uploadKey || remotePath || localLayer);

			if(uploadKey || remotePath || localLayer) {
				if(!processes[processKey]) {
					processes[processKey] = {
						status: "running"
					};

					let type, identifier;
					if(uploadKey) {
						type = "uploadKey";
						identifier  = uploadKey;
					} else if(remotePath) {
						type = "remotePath";
						identifier = remotePath;
					} else if (localLayer) {
						type = "localLayer";
						identifier = localLayer;
					}

					this._calculatePragueTemperatureMapUsingNeuralNetworkModel.execute({
						dataInputs:
							[ { identifier: 'inputFile',
								data: `${type}:${identifier}` } ],
						owner: request.session.user
					}).then((result) => {
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
				if(processes[processKey]['status'] === "error") {
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