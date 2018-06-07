const config = require('../config');

const CalculatePragueTemperatureMapUsingNeuralNetworkModel = require('../wps/processes/CalculatePragueTemperatureMapUsingNeuralNetworkModel');

let processes = {};

class PucsMatlabProcessorController {
	constructor(app, pgPool, pgSchema, mongo) {
		app.post('/rest/pucs/execute_matlab', this.executeMatlabProcessor.bind(this));

		this._calculatePragueTemperatureMapUsingNeuralNetworkModel = new CalculatePragueTemperatureMapUsingNeuralNetworkModel(pgPool, processes, config.pantherTemporaryStoragePath, config.pantherDataStoragePath, pgSchema, mongo);
	}

	executeMatlabProcessor(request, response) {
		let uploadKey = request.body.uploadKey;
		if(uploadKey) {
			if(!processes[uploadKey]) {
				processes[uploadKey] = {
					status: "running"
				};

				this._calculatePragueTemperatureMapUsingNeuralNetworkModel.execute({
					dataInputs:
						[ { identifier: 'inputFile',
							data: `upload:${uploadKey}` } ],
					owner: request.session.user
				}).then((result) => {
					processes[uploadKey] = {
						status: "done",
						result: result[0].data
					};
				});
			}
			response.status(200).json(processes[uploadKey]);
		} else {
			response.status(500).json({
				message: "unknown upload key",
				success: false
			})
		}
	}
}


module.exports = PucsMatlabProcessorController;