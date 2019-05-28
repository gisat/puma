const fs = require('fs').promises;

const IntegrateCityProcessor = require('../../../integration/lulc/IntegrateCityProcessor');

describe('IntegrateLulcProcessor', () => {
    it('generatesProperMetadataAndData', function(done){
        const inputToProcessor = {
            scope: 1,
            place: 'Argentina', // Place will be created as part of the process.
            periods: [
                {id: 1, name: '2017'},
                {id: 2, name: '2006'}
            ], // Period is part of the name of the layer.
            analyticalUnitLevels: [{
                id : 1,
                layer: null,
            }, {
                id : 2,
                layer: null,
            }, {
                id : 3,
                layer: null,
            }],
            themes: [
                // TODO: Go Back to transportation.
                /*{
                    id: 4,
                    attributeSets: [
                        {
                            id: 1,
                            attributes: [
                                {id: 1, code: 10},
                                {id: 2, code: 20}
                            ],
                            columnName: 'CT_L1'
                        }
                    ],
                    layerTemplates: [
                        {id: 1, layerNameTemplate: 'EO4SD_\.*_TRANSPORT_\.*'}
                    ],
                    integrationType: 'transportationNetwork'
                },*/


                {
                    id: 6,
                    attributeSets: [
                        {
                            id: 1,
                            attributes: [
                                {id: 1, code: 0},
                                {id: 2, code: 1}
                            ],
                            columnName: 'WATERCODE'
                        }
                    ],
                    layerTemplates: [
                        {id: 1, layerNameTemplate: 'EO4SD_\.*_FLOOD_\.*'}
                    ],
                    integrationType: 'floods'
                },

                {
                    id: 7,
                    filteringAttribute: 'C_LCF2', // This is the name of the column we will filter the values on.
                    // Filter before running the LULC Processor.
                    attributeSets: [
                        {
                            id: 2, // Formation. Always in the later year
                            attributes: [
                                {id: 1, code: 10000},
                                {id: 2, code: 11000}
                            ],
                            columnName: 'C_L2_2017',
                            filteringAttributeValue: 'LCF21',
                            type: 'formation'
                        },

                        {
                            id: 3, // Consumption. Always in the former year
                            attributes: [
                                {id: 1, code: 10000},
                                {id: 2, code: 11000}
                            ],
                            columnName: 'C_L2_2006',
                            filteringAttributeValue: 'LCF21',
                            type: 'consumption'
                        }
                    ],
                    layerTemplates: [
                        {id: 1, layerNameTemplate: 'EO4SD_\.*_LULC_CHANGEVHR_\.*_\.*'}
                    ],
                    integrationType: 'landUseLandCoverChangeFlow'
                },
                {
                    id: 1,
                    periods: [2014],
                    attributeSets: [
                        {
                            id: 4,
                            attributes: [
                                {id: 1, code: 10000},
                                {id: 2, code: 20000}
                            ],
                            columnName: 'C_L1',
                        },
                        {
                            id: 5,
                            attributes: [
                                {id: 1, code: 11000},
                                {id: 2, code: 12000}
                            ],
                            columnName: 'C_L2',
                        },
                        {
                            id: 6,
                            attributes: [
                                {id: 1, code: 11100},
                                {id: 2, code: 12100}
                            ],
                            columnName: 'C_L3',
                        }
                    ],
                    layerTemplates: [
                        {id: 1, layerNameTemplate: 'EO4SD_\.*_LULCVHR_\.*'}
                    ],
                    integrationType: 'landUseLandCoverVeryHighResolution'
                },

                {
                    id: 2,
                    attributeSets: [
                        {
                            id: 7,
                            attributes: [
                                {id: 1, code: 10},
                                {id: 2, code: 20}
                            ],
                            columnName: 'CG_L1'
                        },
                        {
                            id: 1,
                            attributes: [
                                {id: 1, code: 11},
                                {id: 2, code: 12}
                            ],
                            columnName: 'CG_L2'
                        }
                    ],
                    layerTemplates: [
                        {id: 1, layerNameTemplate: 'EO4SD_\.*_GREENEXT_\.*'}
                    ],
                    integrationType: 'urbanGreenExtended'
                },

                {
                    id: 3,
                    attributeSets: [
                        {
                            id: 1,
                            attributes: [
                                {id: 1}
                            ]
                        }
                    ],
                    layerTemplates: [
                        {id: 1, layerNameTemplate: 'EO4SD_\.*_NODE_\.*'}
                    ],
                    integrationType: 'connectivityNode'
                },

                // This I guess needs to be somehow custom.
                {
                    id: 5,
                    attributeSets: [
                        {
                            id: 1,
                            attributes: [
                                {id: 1, code: 10},
                                {id: 2, code: 20}
                            ],
                            columnName: 'CT_L1'
                        }
                    ],
                    layerTemplates: [
                        {id: 1, layerNameTemplate: 'EO4SD_\.*_INFORMAL_\.*'}
                    ],
                    integrationType: 'informalSettlements'
                }
            ],
            layers: [
                {
                    name: 'EO4SD_DHAKA_GREENEXT_2017',
                    content: ''
                },
                {
                    name: 'EO4SD_DHAKA_INFORMAL_2017',
                    content: ''
                },
                {
                    name: 'EO4SD_DHAKA_LULC_CHANGEVHR_2006_2017',
                    content: ''
                },
                {
                    name: 'EO4SD_DHAKA_LULCVHR_2017',
                    content: ''
                },
                {
                    name: 'EO4SD_DHAKA_NODE_2017',
                    content: ''
                },
                {
                    name: 'EO4SD_DHAKA_TRANSPORT_2017',
                    content: ''
                },
                {
                    name: 'EO4SD_DHAKA_FLOOD_2014',
                    content: ''
                }
            ]
        };

        let cityProcessor;
        fs.readFile('./test/unit/wps/integrateCity/EO4SD_DHAKA_AL1.geojson', 'utf8').then(result => {
            inputToProcessor.analyticalUnitLevels[0].layer = JSON.parse(result);
            return fs.readFile('./test/unit/wps/integrateCity/EO4SD_DHAKA_AL2.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.analyticalUnitLevels[1].layer = JSON.parse(result);
            return fs.readFile('./test/unit/wps/integrateCity/EO4SD_DHAKA_AL3.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.analyticalUnitLevels[2].layer = JSON.parse(result);
            return fs.readFile('./test/unit/wps/integrateCity/EO4SD_DHAKA_GREENEXT_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[0].content = JSON.parse(result);
            return fs.readFile('./test/unit/wps/integrateCity/EO4SD_DHAKA_INFORMAL_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[1].content = JSON.parse(result);
            return fs.readFile('./test/unit/wps/integrateCity/EO4SD_DHAKA_LULC_CHANGEVHR_2006_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[2].content = JSON.parse(result);
            return fs.readFile('./test/unit/wps/integrateCity/EO4SD_DHAKA_LULCVHR_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[3].content = JSON.parse(result);
            return fs.readFile('./test/unit/wps/integrateCity/EO4SD_DHAKA_NODE_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[4].content = JSON.parse(result);
            return fs.readFile('./test/unit/wps/integrateCity/EO4SD_DHAKA_TRANSPORT_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[5].content = JSON.parse(result);
            return fs.readFile('./test/unit/wps/integrateCity/EO4SD_DHAKA_FLOOD_2014.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[6].content = JSON.parse(result);

            cityProcessor = new IntegrateCityProcessor(inputToProcessor);
            return cityProcessor.geoJson();
        }).then(result => {
            console.log(result);
            return Promise.all(result.map((analyticalLayer, index) => {
                return fs.writeFile(`./test/unit/wps/integrateCity/result${index}.geojson`, JSON.stringify(analyticalLayer), 'utf8');
            }));
        }).then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    })
});