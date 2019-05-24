const WpsBaseProcess = require('../WpsBaseProcess');

class ImportPlaceToExisitngLulcScope extends WpsBaseProcess {
    constructor(runningProcesses, mongo) {
        super();

        this._mongo = mongo;
        this._runningProcesses = runningProcesses;

        this._describe = {
            identifier: `LandUseLandCoverAnalysis`,
            title: `Analyse Land Use Land Cover`,
            abstract: `Distribute the Land Use Classes from the Vector Layer to standard set of LULC classes based on the
                nomenclature in provided Attributes. The key input is a vector layer with areas for distribution of the 
                resulting areas. The result is GeoJSON file with areas from second input and column per class with the 
                area of the given class within the delineated area. `,
            inputs: {
                scope: {
                    // The scope for loading the metadata information necessary for full generation of the data.
                },
                place: {
                    // Name of the new place.
                },
                // All the source layers are expected in the form of GeoJSON. Integrate the layers into the GeoServer.
                // Create mapping for the layers.
                // Layer template needs to contain the template for the layer name to link into it.
                // Periods are handled based on the provided information.
                sourceLulcVHRLayer: {
                    // The layer to be used in the analysis as the input.
                },
                sourceLulcHRLayer: {
                    //
                },
                sourceUrbanGreenLayer: {

                },
                sourceInformalSettlementsLayer: {

                },
                sourceOpenAndGreenAreas: {

                },
                sourceTransportation: {

                },
                sourceFloods: {

                },
                sourceAnalyticalUnits: {
                    // Array of analytical units to integrate.
                }
            }
        }
    }

    execute(parsedRequest) {
        // Gather all metadata relevant for the work.
            // Scope object
            // Associated Layer Templates
            // Associated Themes - Should specify which analysis is part of the Theme
            // Associated Attribute Sets - Associated to the Theme.
        /*
        So the initial data structure that is coming to the analysis is:
        {
            scope: 1,
            place: 'Argentina', // Place will be created as part of the process.
            period: 1 // Period is part of the name of the layer.
            themes: [
                {
                    id: 1,
                    layerTemplates: [
                        {id: 1, layerNameTemplate: '*VHR_*'}, // layerNameTemplate is Regex.
                        {id: 2, layerNameTemplate: '*VHR_*'}
                    ],
                    attributeSets: [
                        {
                            id: 1,
                            attributes: [
                                {id: 1, code: 11100},
                                {id: 2, code: 12100}
                            ],
                        },
                        {
                            id: 1,
                            attributes: [
                                {id: 1, code: 11100},
                                {id: 2, code: 12100}
                            ],
                        }
                    ],
                    integrationType: 'landUseLandCoverVeryHighResolution'
                }
            ]
        }
         */
        // It is possible that for the Change we will need to change the structure a bit. 

        // Load attributes in the relevant attribute sets.
        // This means that for the EO4SD data we will need to perform the transformation from Shapefile to GeoJSON. 
        parsedRequest.attributeSets; //
        parsedRequest.sourceLulcLayer; // GeoJSON containing the information about the layer.
        parserRequest.sourceAnalyticalUnitsLayers; // Array of GeoJSON files to be handled.


        // GeoServerImporter.
        //
    }
}

module.exports = LandUseLandCoverAnalysis;