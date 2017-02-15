Main purpose for this file is to document possible ways to import the data in to the solution. 

# WPS

## GetCapabilities Request

This request defines the WPS endpoint and its capabilities.
 
URL: /wps

Parameters: 

* service=WPS
* version=1.0.0
* request=GetCapabilities

Response:

```
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
                    <ows:Get xlink:href="https://puma.worldbank.org/geoserver/wps"/>
                    <ows:Post xlink:href="https://puma.worldbank.org/geoserver/wps"/>
                </ows:HTTP>
            </ows:DCP>
        </ows:Operation>
        <ows:Operation name="DescribeProcess">
            <ows:DCP>
                <ows:HTTP>
                    <ows:Get xlink:href="https://puma.worldbank.org/geoserver/wps"/>
                    <ows:Post xlink:href="https://puma.worldbank.org/geoserver/wps"/>
                </ows:HTTP>
            </ows:DCP>
        </ows:Operation>
        <ows:Operation name="Execute">
            <ows:DCP>
                <ows:HTTP>
                    <ows:Post xlink:href="https://puma.worldbank.org/geoserver/wps"/>
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
```

## DescribeProcess Request

It describes inputs and outputs for the process. 

URL: /wps

Parameters: 

* service=WPS
* version=1.0.0 
* request=DescribeProcess 
* identifier=ImportToExistingScope
 
Response: 

```
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
```

## Execute Request

This request actually initiates the import of the data into the database as well as mapping them on the analytical units in the system. 

URL: /wps

Parameters: 

* service=WPS
* version=1.0.0 
* request=Execute 
* identifier=ImportToExistingScope

Response after started:

```
<wps:ExecuteResponse
        xmlns:wps="http://www.opengis.net/wps/1.0.0"
        xmlns:ows="http://www.opengis.net/ows/1.1"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.opengis.net/wps/1.0.0/wpsExecute_response.xsd"
        service="WPS"
        version="1.0.0"
        xml:lang="en-CA"
        serviceInstance="http://urban-tep.gisat.cz/status/wps"
        statusLocation="http://urban-tep.gisat.cz/status/wps/${id} ">
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
            <wps:Reference xlink:href="http://urban-tep.gisat.cz/inputs/wps" method="GET" mimeType="application/zip" encoding="UTF-8" />
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
```

Response after Success: 

```
<wps:ExecuteResponse
        xmlns:wps="http://www.opengis.net/wps/1.0.0"
        xmlns:ows="http://www.opengis.net/ows/1.1"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.opengis.net/wps/1.0.0/wpsExecute_response.xsd"
        service="WPS"
        version="1.0.0"
        xml:lang="en-CA"
        serviceInstance="http://urban-tep.gisat.cz/status/wps"
        statusLocation="http://urban-tep.gisat.cz/status/wps/${id} ">
    <wps:Process wps:processVersion="1">
        <ows:Identifier>ImportToExistingScope</ows:Identifier>
        <ows:Title>Import new data to existing Scope</ows:Title>
        <ows:Abstract>There must be valid User in the application. It also assumes that there is at least one valid Scope in the application with associated analytical units. It is always running asynchronously.</ows:Abstract>
    </wps:Process>
    <wps:Status creationTime="2016-04-18T12:13:14Z">
        <wps:ProcessSucceeded>http://urban-tep.gisat.cz/tool/?id=2343</wps:ProcessSucceeded>
    </wps:Status>
    <wps:DataInputs>
        <wps:Input>
            <ows:Identifier>data</ows:Identifier>
            <ows:Title>Data</ows:Title>
            <wps:Reference xlink:href="http://urban-tep.gisat.cz/inputs/wps" method="GET" mimeType="application/zip" encoding="UTF-8" />
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
```

Response after Error: 

```
<wps:ExecuteResponse
        xmlns:wps="http://www.opengis.net/wps/1.0.0"
        xmlns:ows="http://www.opengis.net/ows/1.1"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.opengis.net/wps/1.0.0/wpsExecute_response.xsd"
        service="WPS"
        version="1.0.0"
        xml:lang="en-CA"
        serviceInstance="http://urban-tep.gisat.cz/status/wps"
        statusLocation="http://urban-tep.gisat.cz/status/wps/${id} ">
    <wps:Process wps:processVersion="1">
        <ows:Identifier>ImportToExistingScope</ows:Identifier>
        <ows:Title>Import new data to existing Scope</ows:Title>
        <ows:Abstract>There must be valid User in the application. It also assumes that there is at least one valid Scope in the application with associated analytical units. It is always running asynchronously.</ows:Abstract>
    </wps:Process>
    <wps:Status creationTime="2016-04-18T12:13:14Z">
        <wps:ProcessFailed>http://urban-tep.gisat.cz/tool/?id=2343</wps:ProcessFailed>
    </wps:Status>
    <wps:DataInputs>
        <wps:Input>
            <ows:Identifier>data</ows:Identifier>
            <ows:Title>Data</ows:Title>
            <wps:Reference xlink:href="http://urban-tep.gisat.cz/inputs/wps" method="GET" mimeType="application/zip" encoding="UTF-8" />
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
```