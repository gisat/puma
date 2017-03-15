let MapToAllPlaces = require('./MapToAllPlaces');
let conn = require('../common/conn');
let MongoLocations = require('../metadata/MongoLocations');
let MongoScopes = require('../metadata/MongoScopes');
let config = require('../config');


let currentProcess = {

};

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
	}

	/**
	 *
	 * @param request
	 * @param response
	 */
	wpsGet(request, response) {
		if(request.query.request == 'GetCapabilities'.toLowerCase()) {
			this.getCapabilities(response);
		} else if(request.query.request == 'DescribeProcess'.toLowerCase()) {
			this.describeProcess(request.query.identifier, response);
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
		if(request.body.request == 'GetCapabilities'.toLowerCase()) {
			this.getCapabilities(response);
		} else if(request.body.request == 'DescribeProcess'.toLowerCase()) {
			this.describeProcess(request.body.identifier, response);
		} else if(request.body.request == 'Execute'.toLowerCase()) {
			this.execute(request, response);
		} else {
			response.status(400).json({status: "Incorrect request. Valid choices are GetCapabilities, DescribeProcess and Execute for POST request."})
		}
	}

	inputs(request, response) {
		let id = request.params.id;

		if(currentProcess[id] && currentProcess[id].file) {
			response.download(currentProcess[id].file);
		} else {
			response.status(400).json({status: "Incorrect request. Process with given id doesn't exist."});
		}
	}

	status(request, response) {
		let id = request.params.id;

		if(currentProcess[id]) {
			let data = '';
			if(currentProcess[id].file) {
				data = `
					<wps:Input>
						<ows:Identifier>data</ows:Identifier>
						<ows:Title>Data</ows:Title>
						<wps:Reference xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/inputs/wps/${id}" method="GET" mimeType="application/zip" encoding="UTF-8" />
					</wps:Input>
				`;
			}

			let scope = '';
			if(currentProcess[id].scope) {
				scope = `
					<wps:Input>
						<ows:Identifier>scope</ows:Identifier>
						<ows:Title>Scope</ows:Title>
						<wps:Data>
							<wps:LiteralData>${currentProcess[id].scope}</wps:LiteralData>
						</wps:Data>
					</wps:Input>
				`;
			}

			let place = '';
			if(currentProcess[id].place) {
				place = `
					<wps:Input>
						<ows:Identifier>place</ows:Identifier>
						<ows:Title>Place</ows:Title>
						<wps:Data>
							<wps:LiteralData>${currentProcess[id].place}</wps:LiteralData>
						</wps:Data>
					</wps:Input>
				`;
			}

			response.set('Content-Type', 'text/xml');
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
					serviceInstance="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/wps"
					statusLocation="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/status/wps/${id} ">
				<wps:Process wps:processVersion="1">
					<ows:Identifier>ImportToExistingScope</ows:Identifier>
					<ows:Title>Import new data to existing Scope</ows:Title>
					<ows:Abstract>There must be valid User in the application. It also assumes that there is at least one valid Scope in the application with associated analytical units. It is always running asynchronously.</ows:Abstract>
				</wps:Process>
				<wps:Status creationTime="2016-04-18T12:13:14Z">
					<wps:ProcessSucceeded>${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/?id=2343</wps:ProcessSucceeded>
				</wps:Status>
				<wps:DataInputs>
					${data}
					${scope}
					${place}
				</wps:DataInputs>
			
				<wps:ProcessOutputs></wps:ProcessOutputs>
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
	execute(request, response) {
		let id = conn.getNextId();

		currentProcess[id] = {
			scope: request.body.scope,
			place: request.body.place,
			file: request.files[0]
		};

		response.set('Content-Type', 'text/xml');
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
					serviceInstance="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/wps"
					statusLocation="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/status/wps/${id} ">
				<wps:Process wps:processVersion="1">
					<ows:Identifier>ImportToExistingScope</ows:Identifier>
					<ows:Title>Import new data to existing Scope</ows:Title>
					<ows:Abstract>There must be valid User in the application. It also assumes that there is at least one valid Scope in the application with associated analytical units. It is always running asynchronously.</ows:Abstract>
				</wps:Process>
				<wps:Status creationTime="2016-04-18T12:13:14Z">
					<wps:ProcessStarted/>
				</wps:Status>
				<wps:DataInputs>
					<wps:Input>
						<ows:Identifier>data</ows:Identifier>
						<ows:Title>Data</ows:Title>
						<wps:Reference xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/inputs/wps/${id}" method="GET" mimeType="application/zip" encoding="UTF-8" />
					</wps:Input>
					<wps:Input>
						<ows:Identifier>scope</ows:Identifier>
						<ows:Title>Scope</ows:Title>
						<wps:Data>
							<wps:LiteralData>1</wps:LiteralData>
						</wps:Data>
					</wps:Input>
					<wps:Input>
						<ows:Identifier>place</ows:Identifier>
						<ows:Title>Place</ows:Title>
						<wps:Data>
							<wps:LiteralData>1</wps:LiteralData>
						</wps:Data>
					</wps:Input>
				</wps:DataInputs>
			
				<wps:ProcessOutputs></wps:ProcessOutputs>
			</wps:ExecuteResponse>
		`);
	}

	/**
	 *
	 * @param identifier {String}
	 * @param response
	 */
	describeProcess(identifier, response) {
		let description;

		if(identifier == 'ImportToExistingScope') {
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
		response.set('Content-Type', 'text/xml');
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
}

module.exports = WpsController;