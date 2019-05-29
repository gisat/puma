const fs = require('fs').promises;
const should = require('should');

const ConnectivityNodes = require('../../../integration/lulc/ConnectivityNodes');

describe('ConnectivityNodes', () => {
    describe('#geoJson', () => {
        it('returns proper GeoJson', async done => {
            try {
                let au = await fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_AL1.geojson', 'utf8');
                au = JSON.parse(au);

                let transportationSource = await fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_NODE_2017.geojson', 'utf8');
                transportationSource = JSON.parse(transportationSource);

                const attributesL1 = [{
                    id: 1,
                    columnName: 'CT_L1'
                }];

                const result = await new ConnectivityNodes(attributesL1, au, transportationSource).geoJson();

                const properties = result.features[0].properties;
                should(properties[1]).be.exactly(18693);

                done();
            } catch(error) {
                done(error);
            }
        });
    })
});