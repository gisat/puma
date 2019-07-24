const should = require('should');
const config = require('../config');

const connectToMongo = require('../../connectToMongo');
const MetadataForIntegration = require('../../../integration/lulc/MetadataForIntegration');
const S3Bucket = require('../../../storage/S3Bucket');

describe('MetadataForIntegration', () => {
    describe('#metadata', () => {
        it('Provides json with relevant metadata', async (done) => {
            try {
                const mongo = await connectToMongo();
                const result = await new MetadataForIntegration(mongo, 600000000).metadata('Argentina','uuid', 'http://test');

                should(result.analyticalUnitLevels.length).be.exactly(4);
                should(result.periods.length).be.exactly(3);
                should(result.place).be.exactly('Argentina');
                should(result.url).be.exactly('http://test');
                should(result.uuid).be.exactly('uuid');
                should(result.themes.length).be.exactly(22);

                const theme = result.themes.filter(theme => theme.id == '620001300')[0];
                should(theme.layerTemplates.length).be.exactly(1);
                should(theme.attributeSets.length).be.exactly(2);

                const attributeSet = theme.attributeSets[0];
                should(attributeSet.attributes.length).be.exactly(19);

                done();
            } catch(err) {
                done(err);
            }
        });
    });

    describe('#layers', () => {
        it('loads provided layers', async done => {
            try {
                const mongo = await connectToMongo();
                const integrator = new MetadataForIntegration(mongo, 600000000, new S3Bucket(config.aws.name, config.aws.accessKeyId, config.aws.secretAccessKey));
                const result = await integrator.metadata('Argentina','uuid2', 'http://test');
                await integrator.layers(result, [{
                    path: './test/unit/integration/integrateCity/EO4SD_DHAKA_AL1.geojson',
                    originalFilename: 'EO4SD_DHAKA_AL1.geojson'
                }, {
                    path: './test/unit/integration/integrateCity/EO4SD_DHAKA_LULCVHR_2017.geojson',
                    originalFilename: 'EO4SD_DHAKA_LULCVHR_2017.geojson'
                }]);

                should(result.analyticalUnitLevels[0].layer).be.exactly('uuid2/EO4SD_DHAKA_AL1.geojson');
                should(result.layers.length).be.exactly(1);
                should(result.layers[0].content).be.exactly('uuid2/EO4SD_DHAKA_LULCVHR_2017.geojson');

                done();
            } catch(e) {
                console.log(e);

                done(e);
            }
        })
    });

    describe('#layerRefs', () => {
        it('prepares Layer Refs for insertion based on the data from analysis', () => {
            const integrator = new MetadataForIntegration(null, 60000000);
            const references = integrator.layerRefs({
                analyticalUnitLevels: [{
                    id : 1,
                    table: 'geonode:i11_dhaka_al1',
                    layer: null,
                }],
                themes: [{
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
                    integrationType: 'floods',
                    periods: [1]
                }]
            },1);

            should(references.length).be.exactly(3);
            should(references[0].areaTemplate).be.exactly(1);
            should(references[0].attributeSet).be.exactly(1);
            should(references[0].columnMap.length).be.exactly(2);
            should(references[0].columnMap[0].column).be.exactly('as_1_attr_1_p_1');
        })
    });
});