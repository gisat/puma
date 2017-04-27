let MapToAllPlaces = require('./MapToAllPlaces');
let conn = require('../common/conn');
let MongoLocations = require('../metadata/MongoLocations');
let MongoScopes = require('../metadata/MongoScopes');
let config = require('../config');
let _ = require('lodash');

let LayerImporter = require('../integration/LayerImporter');
let LayerImporterTasks = require('../integration/LayerImporterTasks');


let currentProcess = {};

class WpsController {
    /**
     *
     * @param app
     * @param pgPool
     * @param mongo
     * @param wpsProcesses {Map} Map of the WPS processes available to run
     */
    constructor(app, pgPool, mongo, wpsProcesses) {
        app.get('/rest/wps', this.wpsGet.bind(this));
        app.post('/rest/wps', this.wpsPost.bind(this));
        app.post('/rest/status/wps/:id', this.status.bind(this));
        app.get('/rest/inputs/wps', this.inputs.bind(this));
        
        this.mapToAllPlaces = new MapToAllPlaces(pgPool, mongo);
        
        this._layerImporterTasks = new LayerImporterTasks();
        this._layerImporter = new LayerImporter(pgPool, mongo, this._layerImporterTasks);
    }
    
    /**
     *
     * @param request
     * @param response
     */
    wpsGet(request, response) {
        let requestAction = request.query.request.toLowerCase();
        if (requestAction === 'getcapabilities') {
            this.getCapabilities(response);
        } else if (requestAction === 'describeprocess') {
            this.describeProcess(request.query.identifier, response);
        } else if (requestAction === 'execute') {
            this.execute(request, response);
        } else {
            response.status(400).json({status: "Incorrect request. Valid choices are GetCapabilities and DescribeProcess for GET request."})
        }
    }
    
    /**
     *
     * @param request
     * @param response
     */
    wpsPost(request, response) {
        Promise.resolve().then(() => {
            if (request.headers['content-type'] !== 'application/xml') throw new Error(`Content type 'application/xml' is expected!`);
            return this.parseMethodInputsFromXmlDocument(request);
        }).then(wpsInputs => {
                if (wpsInputs.operation === 'getcapabilities') {
                    this.getCapabilities(response);
                } else if (wpsInputs.operation === 'describeprocess') {
                    this.describeProcess(request.body.identifier, response);
                } else if (wpsInputs.operation === 'execute') {
                    this.execute(request, response, wpsInputs);
                } else {
                    throw new Error(`Incorrect request. Valid choices are GetCapabilities, DescribeProcess and Execute for POST request.`);
                }
            }
        ).catch(error => {
            response.status(400).json({status: `${error.message}`})
        });
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
            
            if (progress >= 0) {
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
    
    /**
     *
     * @param identifier {String}
     * @param response
     */
    describeProcess(identifier, response) {
        let description;
        
        if (identifier == 'ImportToExistingScope') {
            description = this.mapToAllPlaces.describe();
        } else {
            response.status(400).json({status: "Err: Not supported identifier."});
            return;
        }
        
        response.set('Content-Type', 'text/xml');
        response.send(description);
    }
    
    /**
     *
     * @param response
     */
    getCapabilities(response) {
        response.set('Content-Type', 'application/xml');
        response.send(`
			<wps:Capabilities xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xml:lang="en" service="WPS" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
				<ows:ServiceIdentification>
					<ows:Title>Prototype Panther WPS</ows:Title>
					<ows:Abstract/>
					<ows:ServiceType>WPS</ows:ServiceType>
					<ows:ServiceTypeVersion>1.0.0</ows:ServiceTypeVersion>
				</ows:ServiceIdentification>
				<ows:ServiceProvider>
					<ows:ProviderName>Panther</ows:ProviderName>
					<ows:ProviderSite xlink:href="http://www.gisat.cz"/>
					<ows:ServiceContact/>
				</ows:ServiceProvider>
				<ows:OperationsMetadata>
					<ows:Operation name="GetCapabilities">
						<ows:DCP>
							<ows:HTTP>
								<ows:Get xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/geoserver/wps"/>
								<ows:Post xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/geoserver/wps"/>
							</ows:HTTP>
						</ows:DCP>
					</ows:Operation>
					<ows:Operation name="DescribeProcess">
						<ows:DCP>
							<ows:HTTP>
								<ows:Get xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/geoserver/wps"/>
								<ows:Post xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/geoserver/wps"/>
							</ows:HTTP>
						</ows:DCP>
					</ows:Operation>
					<ows:Operation name="Execute">
						<ows:DCP>
							<ows:HTTP>
								<ows:Post xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/geoserver/wps"/>
							</ows:HTTP>
						</ows:DCP>
					</ows:Operation>
				</ows:OperationsMetadata>
				<wps:ProcessOfferings>
					<wps:Process wps:processVersion="1.0.0">
						<ows:Identifier>ImportToExistingScope</ows:Identifier>
						<ows:Title>Import new data to existing Scope</ows:Title>
						<ows:Abstract>
							There must be valid User in the application. It also assumes that there is at least one valid Scope in the application with associated analytical units. 
						</ows:Abstract>
					</wps:Process>
				</wps:ProcessOfferings>
				<wps:Languages>
					<wps:Default>
						<ows:Language>en-US</ows:Language>
					</wps:Default>
					<wps:Supported>
						<ows:Language>en-US</ows:Language>
					</wps:Supported>
				</wps:Languages>
			</wps:Capabilities>
		`);
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
    
    /**
     * Parse method inputs from XML document
     * @param request
     */
    parseMethodInputsFromXmlDocument(request) {
        return Promise.resolve().then(() => {
            return {
                operation: Object.keys(request.body)[0].split(`:`).pop(),
                method: request.body[Object.keys(request.body)[0]][`ows:identifier`][0],
                user: {
                    id: request.session.user.id
                },
                arguments: _.map(request.body[Object.keys(request.body)[0]][`wps:datainputs`][0][`wps:input`], param => {
                    return {argument: param[`ows:identifier`][0], value: param[`wps:data`][`0`][`wps:literaldata`][0]}
                }),
            };
        });
    }
}


module.exports = WpsController;