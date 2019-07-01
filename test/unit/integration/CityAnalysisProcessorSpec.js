const fs = require('fs').promises;
const should = require('should');

const CityAnalysisProcessor = require('../../../integration/lulc/CityAnalysisProcessor');

describe('IntegrateLulcProcessor', () => {
    it('generatesProperMetadataAndData', function(done){
        const MINUTE = 60000;
        this.timeout(10 * MINUTE);

        const inputToProcessor = {
            scope: 1,
            place: 'Argentina', // Place will be created as part of the process.
            periods: [
                {"id":600002006,"periods":["2002","2003","2004","2005","2006","2007","2008"]},
                {"id":600002014,"periods":["2009","2010","2011","2012","2013","2014"]},
                {"id":600002016,"periods":["2015","2016","2017","2018"]}
            ], // Period is part of the name of the layer.
            analyticalUnitLevels: [{
                id : 1,
                layer: null,
                table: 'geonode:i11_dhaka_al1'
            }],
            themes: [
                {
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
                },


                {
                    id: 6,
                    attributeSets: [
                        {
                            id: 11,
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
                            columnName: 'C_L2',
                            filteringAttributeValue: 'LCF21',
                            type: 'formation'
                        },

                        {
                            id: 3, // Consumption. Always in the former year
                            attributes: [
                                {id: 1, code: 10000},
                                {id: 2, code: 11000}
                            ],
                            columnName: 'C_L2',
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
                    id: 8,
                    filteringAttribute: 'C_LCF2',
                    attributeSets: [
                        {
                            id: 12,
                            attributes: [
                                {id: 1}
                            ],
                            columnName: 'C_L2',
                            filteringAttributeValue: 'LCF21'
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
                            id: 8,
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
                            id: 9,
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
                            id: 10,
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
                },

                {
                    id: 9,
                    attributeSets: [
                        {
                            id: 13,
                            attributes: [
                                {id: 1, code: 10000},
                                {id: 2, code: 20000}
                            ],
                            columnName: 'C_L1',
                        }
                    ],
                    integrationType: 'math',
                    topicForMath: 2,
                    attributeSetsForMath: [7, 8]
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
        fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_AL1.geojson', 'utf8').then(result => {
            inputToProcessor.analyticalUnitLevels[0].layer = JSON.parse(result);
            return fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_GREENEXT_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[0].content = JSON.parse(result);
            return fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_INFORMAL_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[1].content = JSON.parse(result);
            return fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_LULC_CHANGEVHR_2006_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[2].content = JSON.parse(result);
            return fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_LULCVHR_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[3].content = JSON.parse(result);
            return fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_NODE_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[4].content = JSON.parse(result);
            return fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_TRANSPORT_2017.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[5].content = JSON.parse(result);
            return fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_FLOOD_2014.geojson', 'utf8')
        }).then(result => {
            inputToProcessor.layers[6].content = JSON.parse(result);

            cityProcessor = new CityAnalysisProcessor(inputToProcessor);
            return cityProcessor.geoJson();
        }).then(result => {
            should(result[0].features.length).be.exactly(1);

            const properties = result[0].features[0].properties;
            should(properties['as_1_attr_1_p_600002016']).be.exactly(120.9322554457259);
            should(properties['as_2_attr_2_p_600002006']).be.exactly(47791666.549140655);
            should(properties['as_3_attr_2_p_600002006']).be.exactly(39980651.96536081);
            should(properties['as_4_attr_1_p_600002016']).be.exactly(238480653.6101068);
            should(properties['as_5_attr_1_p_600002016']).be.exactly(115032114.4671548);
            should(properties['as_6_attr_1_p_600002016']).be.exactly(78456994.84225093);
            should(properties['as_7_attr_1_p_600002016']).be.exactly(798900.0143297917);
            should(properties['as_8_attr_1_p_600002016']).be.exactly(410373.1492635418);
            should(properties['as_9_attr_1_p_600002016']).be.exactly(18693);
            should(properties['as_11_attr_1_p_600002014']).be.exactly(710068965.397);
            should(properties['as_12_attr_1_p_600002006']).be.exactly(47874499.878249936);
            should(properties['as_12_attr_1_p_600002016']).be.exactly(47874499.878249936);
            should(properties['as_13_attr_1_p_600002016']).be.exactly(388526.86506624985);
        }).then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    })
});