let uuid = require('uuid');

let config = require('../config');

let CalculatePragueTemperatureMapUsingNeuralNetworkModel = require('../wps/processes/CalculatePragueTemperatureMapUsingNeuralNetworkModel');
let ImportToExistingScope = require(`../wps/processes/ImportToExistingScope`);

let runningProcesses = {};

class Wps {
	constructor(pgPool) {
		this._processes = {
			CalculatePragueTemperatureMapUsingNeuralNetworkModel: new CalculatePragueTemperatureMapUsingNeuralNetworkModel(pgPool, runningProcesses, config.pantherTemporaryStoragePath, config.pantherDataStoragePath, config.postgreSqlSchema),
			ImportToExistingScope: new ImportToExistingScope(runningProcesses)
		};
	}

	getCapabilities(response) {
		let processes = [];
		Object.keys(this._processes).forEach((wpsProcessKey) => {
			processes.push(`
            		<wps:Process wps:processVersion="1.0.0">
						<ows:Identifier>${this._processes[wpsProcessKey].identifier()}</ows:Identifier>
						<ows:Title>${this._processes[wpsProcessKey].title()}</ows:Title>
						<ows:Abstract>${this._processes[wpsProcessKey].abstract()}</ows:Abstract>
					</wps:Process>
            `);
		});

		this.sendXmlResponse(response, `<?xml version="1.0" encoding="UTF-8"?>
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
								<ows:Get xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/backend/rest/wps"/>
								<ows:Post xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/backend/rest/wps"/>
							</ows:HTTP>
						</ows:DCP>
					</ows:Operation>
					<ows:Operation name="DescribeProcess">
						<ows:DCP>
							<ows:HTTP>
								<ows:Get xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/backend/rest/wps"/>
								<ows:Post xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/backend/rest/wps"/>
							</ows:HTTP>
						</ows:DCP>
					</ows:Operation>
					<ows:Operation name="Execute">
						<ows:DCP>
							<ows:HTTP>
								<ows:Post xlink:href="${config.remoteProtocol}/${config.remoteAddress}${config.projectHome}/backend/rest/wps"/>
							</ows:HTTP>
						</ows:DCP>
					</ows:Operation>
				</ows:OperationsMetadata>
				<wps:ProcessOfferings>
					${processes.join('\n')}
					</wps:ProcessOfferings>
					<wps:Languages>
						<wps:Default>
							<ows:Language>en-US</ows:Language>
						</wps:Default>
						<wps:Supported>
							<ows:Language>en-US</ows:Language>
						</wps:Supported>
					</wps:Languages>
				</wps:Capabilities>`);
	}

	describeProcess(identifier, response) {
		let identifierWithoutPrefix = identifier.split(`:`)[1] || identifier;
		let process = this._processes[identifierWithoutPrefix];
		if (!process) {
			this.sendXmlResponse(response, this.getExceptionXml(`No such process: ${identifier}`));
		} else {
			let inputs = [];
			Object.keys(process.inputs()).forEach((inputKey) => {
				let input = process.inputs()[inputKey];
				inputs.push(`<Input maxOccurs="${input.unique ? '1' : 'unbounded'}" minOccurs="${input.required ? '1' : '0'}">`);
				inputs.push(`	<ows:Identifier>${input.identifier}</ows:Identifier>`);
				inputs.push(`	<ows:Title>${input.title}</ows:Title>`);
				inputs.push(`	<ows:Abstract>${input.abstract}</ows:Abstract>`);

				if (input.dataType === `ComplexData`) {
					inputs.push(`	<ComplexData>`);
					inputs.push(`		<Default><Format><MimeType>${input.defaultDataType}</MimeType></Format></Default>`);
					inputs.push(`		<Supported>`);

					input.supportedDataTypes.forEach((supportedDataType) => {
						inputs.push(`			<Default><Format><MimeType>${supportedDataType}</MimeType></Format></Default>`);
					});

					inputs.push(`		</Supported>`);
					inputs.push(`	</ComplexData>`);
				} else {
					inputs.push(`<LiteralData><ows:DataType>${input.dataType}</ows:DataType><ows:AnyValue/></LiteralData>`);
				}

			inputs.push(`</Input>`);
			});

			this.sendXmlResponse(response, `<?xml version="1.0" encoding="UTF-8"?>
				<wps:ProcessDescriptions xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ows="http://www.opengis.net/ows/1.1"
								 xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:xlink="http://www.w3.org/1999/xlink"
								 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xml:lang="en" service="WPS"
								 version="1.0.0"
								 xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
					<ProcessDescription wps:processVersion="1.0.0" statusSupported="true" storeSupported="true">
						<ows:Identifier>${process.identifier()}</ows:Identifier>
						<ows:Title>${process.title()}</ows:Title>
						<ows:Abstract>
							${process.abstract()}    
						</ows:Abstract>
						<DataInputs>
							${inputs.join('\n')}
						</DataInputs>
						<ProcessOutputs></ProcessOutputs>
					</ProcessDescription>
				</wps:ProcessDescriptions>`);
		}
	}

	execute(parsedRequest, response) {
		let identifierWithoutPrefix = parsedRequest.identifier.split(`:`)[1] || parsedRequest.identifier;
		let process = this._processes[identifierWithoutPrefix];
		if (!process) {
			this.sendXmlResponse(response, this.getExceptionXml(`No such process: ${parsedRequest.identifier}`));
		} else {
			process.execute(parsedRequest)
				.then((xmlResponse) => {
					this.sendXmlResponse(response, xmlResponse);
				})
				.catch((error) => {
					this.sendXmlResponse(response, this.getExceptionXml(error.message));
				});
		}
	}

	getExceptionXml(exceptionMessage) {
		return `<?xml version="1.0" encoding="UTF-8"?><ows:ExceptionReport xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.1.0" xsi:schemaLocation="http://www.opengis.net/ows/1.1 http://localhost:80/geoserver/schemas/ows/1.1.0/owsAll.xsd">
  					<ows:Exception exceptionCode="NoApplicableCode">
    					<ows:ExceptionText>${exceptionMessage}</ows:ExceptionText>
  					</ows:Exception>
				</ows:ExceptionReport>`;
	}

	sendXmlResponse(response, xml) {
		response.set('Content-Type', 'application/xml');
		response.status(200).send(xml);
	}
}

module.exports = Wps;