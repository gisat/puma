let MapToAllPlaces = require('./MapToAllPlaces');
let conn = require('../common/conn');
let MongoLocations = require('../metadata/MongoLocations');
let MongoScopes = require('../metadata/MongoScopes');
let config = require('../config');

let _ = require('lodash');

let LayerImporter = require('../integration/LayerImporter');
let LayerImporterTasks = require('../integration/LayerImporterTasks');

let Wps = require('../wps/Wps');

let currentProcess = {};

class WpsController {
	/**
	 *
	 * @param app
	 * @param pgPool
	 * @param mongo
	 * @param wpsProcesses {Map} Map of the WPS processes available to run
	 */
	constructor(app, pgPool, pgSchema, mongo, wpsProcesses) {
		app.get('/rest/wps', this.wps.bind(this));
		app.post('/rest/wps', this.wps.bind(this));
		app.post('/rest/status/wps/:id', this.status.bind(this));
		app.get('/rest/inputs/wps', this.inputs.bind(this));

		this.mapToAllPlaces = new MapToAllPlaces(pgPool, mongo);

		this._layerImporterTasks = new LayerImporterTasks();
		this._layerImporter = new LayerImporter(pgPool, mongo, this._layerImporterTasks);

		this._wps = new Wps(pgPool, pgSchema, mongo);
	}

	/**
	 *
	 * @param request
	 * @param response
	 */
	wps(request, response) {
		this.parseWpsQuery(request).then((parsedRequest) => {
			if (parsedRequest.service !== `wps`) {
				this._wps.sendXmlResponse(response, this._wps.getExceptionXml(`Unknown service ${parsedRequest.service}`));
			} else if (parsedRequest.version !== `1.0.0`) {
				this._wps.sendXmlResponse(response, this._wps.getExceptionXml(`Currently supported version of wps is 1.0.0`));
			} else {
				this.processWpsRequest(response, parsedRequest);
			}
		}).catch((error) => {
			this._wps.sendXmlResponse(response, this._wps.getExceptionXml(error.message));
		});
	}

	processWpsRequest(response, parsedRequest) {
		if (parsedRequest.request === 'getcapabilities') {
			this._wps.getCapabilities(response);
		} else if (parsedRequest.request === 'describeprocess') {
			this._wps.describeProcess(parsedRequest.identifier, response);
		} else if (parsedRequest.request === 'execute') {
			this._wps.execute(parsedRequest, response);
		} else {
			response.status(400).json({status: "Incorrect request. Valid choices are GetCapabilities and DescribeProcess for GET request."})
		}
	}

	inputs(request, response) {
		let id = request.params.id;

		if (currentProcess[id] && currentProcess[id].file) {
			response.download(currentProcess[id].file);
		} else {
			response.status(400).json({status: "Incorrect request. Process with given id doesn't exist."});
		}
	}

	status(request, response) {
		let id = request.params.id;
		if (currentProcess[id]) {
			let method = currentProcess[id].method || ``;
			let status = ``;
			let started = ``;
			let ended = ``;
			let progress = ``;
			let error = ``;
			let url = ``;

			if (method === `CustomLayerImport`) {
				let layerImportTask = this._layerImporterTasks.getImporterTask(id);
				status = layerImportTask.status || ``;
				started = layerImportTask.started || ``;
				ended = layerImportTask.ended || ``;
				progress = layerImportTask.progress && layerImportTask.progress >= 0 ? `${layerImportTask.progress}%` : ``;
				error = layerImportTask.message || ``;
				url = layerImportTask.mongoMetadata && layerImportTask.mongoMetadata.dataView ? `${config.remoteProtocol}://${config.remoteAddress}/${config.projectHome}?id=${layerImportTask.mongoMetadata.dataView._id}` : ``;
			}

			if (method) {
				method = `
                        <wps:Process>
					        <ows:Identifier>${method}</ows:Identifier>
				        </wps:Process>
                    `;
			}

			if (status) {
				status = `
                        <wps:Status started="${started}" ended="${ended || ''}">
					        <ows:Value>${status}</ows:Value>
				        </wps:Status>
                    `;
			}

			if (progress) {
				progress = `
                        <wps:Progress>
					        <ows:Value>${progress}</ows:Value>
				        </wps:Progress>
                    `;
			}

			if (error) {
				error = `
                        <wps:Error>
					        <ows:Value>${error}</ows:Value>
				        </wps:Error>
                    `;
			}

			if (url) {
				url = `
                        <wps:LayerUrl>
					        <ows:Value>${url}</ows:Value>
				        </wps:LayerUrl>
                    `;
			}

			response.set('Content-Type', 'application/xml');
			response.send(`
				<wps:ExecuteResponse
					xmlns:wps="http://www.opengis.net/wps/1.0.0"
					xmlns:ows="http://www.opengis.net/ows/1.1"
					xmlns:xlink="http://www.w3.org/1999/xlink"
					xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
					xsi:schemaLocation="http://www.opengis.net/wps/1.0.0/wpsExecute_response.xsd"
					service="WPS"
					version="1.0.0"
					xml:lang="en-CA"
					serviceInstance="${config.remoteProtocol}://${config.remoteAddress}/backend/rest/wps"
					statusLocation="${config.remoteProtocol}://${config.remoteAddress}/backend/rest/status/wps/${id}">
				    ${method}
				    ${status}
				    ${progress}
				    ${error}
				    ${url}
    			</wps:ExecuteResponse>
			`);
		} else {
			response.status(400).json({status: "Incorrect request. Process with given id doesn't exist."})
		}
	}

	/**
	 *
	 * @param request
	 * @param response
	 */
	execute(request, response, wpsInputs) {
		switch (wpsInputs.method) {
			case `CustomLayerImport`:
				this.parseLayerImporterInputsFromWpsInputs(wpsInputs).then(layerImporterInputs => {
					this._layerImporter.importLayer(layerImporterInputs);
					let currentImporterTask = this._layerImporter.getCurrentImporterTask();
					currentProcess[currentImporterTask.id] = {
						created: new Date(),
						method: wpsInputs.method
					};
					request.params.id = currentImporterTask.id;
					this.status(request, response);
				});
				break;
			default:
				response.status(400).json({status: `Method ${inputs.method} was not found!`});
				break;
		}
	}

	parseWpsQuery(request) {
		let parsedWpsQuery = {
			service: null,
			request: null,
			version: null,
			identifier: null,
			dataInputs: null,
			owner: request.session.user
		};

		Object.keys(request.query).forEach(queryKey => {
			if (queryKey.toLowerCase() === `service`) {
				parsedWpsQuery.service = request.query[queryKey].toLowerCase();
			} else if (queryKey.toLowerCase() === `request`) {
				parsedWpsQuery.request = request.query[queryKey].toLowerCase();
			} else if (queryKey.toLowerCase() === `version`) {
				parsedWpsQuery.version = request.query[queryKey].toLowerCase();
			} else if (queryKey.toLowerCase() === `identifier`) {
				parsedWpsQuery.identifier = request.query[queryKey];
			} else if (queryKey.toLowerCase() === `datainputs`) {
				parsedWpsQuery.dataInputs = _.map(request.query[queryKey].split(`;`), (dataInput) => {
					dataInput = dataInput.split('=');
					return {
						identifier: dataInput[0],
						data: dataInput[1]
					}
				});
			}
		});

		if (request.headers['content-type'] === 'application/xml') {
			let mainKeys = Object.keys(request.body);
			let subKeys = Object.keys(request.body[mainKeys[0]]);

			parsedWpsQuery.request = mainKeys[0].split(':')[1] || mainKeys[0];
			parsedWpsQuery.request = parsedWpsQuery.request.toLowerCase();

			parsedWpsQuery.version = (() => {
				for (let key0 of subKeys) {
					if (key0.toLowerCase().includes('acceptversions')) {
						for(let object of request.body[mainKeys[0]][key0]) {
							for(let key1 in object) {
								if(key1.toLowerCase().includes('version')) return object[key1][0];
							}
						}
					}
				}
			})() || request.body[mainKeys[0]]['$']['version'].toLowerCase();

			parsedWpsQuery.service = request.body[mainKeys[0]]['$']['service'].toLowerCase();

			parsedWpsQuery.identifier = (() => {
				for (let key0 of subKeys) {
					if (key0.toLowerCase().includes('identifier')) {
						return request.body[mainKeys[0]][key0][0];
					}
				}
			})();

			parsedWpsQuery.dataInputs = (() => {
				for (let key0 of subKeys) {
					if (key0.toLowerCase().includes('datainputs')) {
						for(let object of request.body[mainKeys[0]][key0]) {
							for(let key1 in object) {
								if(key1.toLowerCase().includes('input')) {
									return _.map(object[key1], (input) => {
										return ((input) => {
											let dataInput = {};
											for(let key in input) {
												if(key.toLowerCase().includes('identifier')) {
													dataInput.identifier = input[key][0];
												} else if(key.toLowerCase().includes('data')) {
													dataInput.data = ((input) => {
														for(let key in input) {
															if(key.toLowerCase().includes('literaldata')) return input[key][0];
														}
													})(input[key][0]);
												} else if(key.toLowerCase().includes('reference')) {
													dataInput.reference = ((input) => {
														for(let key in input) {
															if(key.toLowerCase().includes('href')) return input[key];
														}
													})(input[key][0]['$']);
												}
											}
											return dataInput;
										})(input);
									});
								}
							}
						}
					}
				}
			})();
		}

		return Promise.resolve(parsedWpsQuery);
	}

	parseLayerImporterInputsFromWpsInputs(wpsInputs) {
		return Promise.resolve().then(() => {
			let layerImporterInputs = {
				user: wpsInputs.user
			};

			_.each(wpsInputs.arguments, argument => {
				layerImporterInputs[argument.argument] = argument.value;
			});

			layerImporterInputs.customName = layerImporterInputs.name;
			layerImporterInputs.name = layerImporterInputs.url.split(`/`).pop();

			return layerImporterInputs;
		});
	}
}


module.exports = WpsController;