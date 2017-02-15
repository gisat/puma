class MapToAllPlaces {
	describe() {
		return `
		<wps:ProcessDescriptions xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ows="http://www.opengis.net/ows/1.1"
                         xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:xlink="http://www.w3.org/1999/xlink"
                         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xml:lang="en" service="WPS"
                         version="1.0.0"
                         xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
			<ProcessDescription wps:processVersion="1.0.0" statusSupported="true" storeSupported="true">
				<ows:Identifier>ImportToExistingScope</ows:Identifier>
				<ows:Title>Import new data to existing Scope</ows:Title>
				<ows:Abstract>
					There must be valid User in the application. It also assumes that there is at least one valid Scope in the application with associated analytical units. It is always running asynchronously.    
				</ows:Abstract>
				<DataInputs>
					<Input maxOccurs="1" minOccurs="1">
						<ows:Identifier>data</ows:Identifier>
						<ows:Title>data</ows:Title>
						<ows:Abstract>Input file containing data to import. Name is also used as a part of the name for result attributes. </ows:Abstract>
						<ComplexData>
							<Default>
								<Format>
									<MimeType>image/tiff</MimeType>
								</Format>
							</Default>
							<Supported>
								<Format>
									<MimeType>application/zip</MimeType>
								</Format>
							</Supported>
						</ComplexData>
					</Input>
					<Input maxOccurs="1" minOccurs="0">
						<ows:Identifier>scope</ows:Identifier>
						<ows:Title>Scope</ows:Title>
						<ows:Abstract>
							Id of the scope to which should the import of the data will be limited.
						</ows:Abstract>
						<LiteralData>
							<ows:DataType>xs:int</ows:DataType>
							<ows:AnyValue/>
						</LiteralData>
					</Input>
					<Input maxOccurs="1" minOccurs="0">
						<ows:Identifier>place</ows:Identifier>
						<ows:Title>Place</ows:Title>
						<ows:Abstract>
							Id of the place to which should the import of the data will be limited.
						</ows:Abstract>
						<LiteralData>
							<ows:DataType>xs:int</ows:DataType>
							<ows:AnyValue/>
						</LiteralData>
					</Input>
				</DataInputs>
				<ProcessOutputs></ProcessOutputs>
			</ProcessDescription>
		</wps:ProcessDescriptions>
		`;
	}
}

module.exports = MapToAllPlaces;