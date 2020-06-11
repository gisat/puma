const {v4: uuid} = require('uuid');
const _ = require('lodash');

const TacrGeoinvazeImporter = require('./TacrGeoinvazeImporter');

const processes = [];

class GeoinvImportController {
	constructor(app, pgPool) {
		app.post('/rest/import/geoinv', this.import.bind(this));
		app.get('/rest/import/geoinv/process/:key', this.getProcess.bind(this));
		app.get('/rest/import/geoinv/processes', this.getProcesses.bind(this));

		this._tacrGeoinvazeImporter = new TacrGeoinvazeImporter(pgPool);
	}

	import(request, response) {
		let process = {
			key: uuid(),
			status: "running",
			started: new Date().toLocaleString(),
			ended: null,
			error: null,
			payload: request.body
		}

		this._tacrGeoinvazeImporter
			.import(request.body)
			.then(() => {
				process.status = "done";
			})
			.catch((error) => {
				process.status = "failed";
				process.error = error.message;
			})
			.then(() => {
				process.ended = new Date().toLocaleString();
			})

		processes.push(process);
		response.status(200).send(process);
	}

	getProcess(request, response) {
		let processKey = request.params.key;

		response.status(200).send(_.find(processes, (process) => {
			return process.key === processKey;
		}))
	}

	getProcesses(request, response) {
		response.status(200).send(processes);
	}
}

module.exports = GeoinvImportController;