const fs = require('fs').promises;
const should = require('should');

const TransportationNetwork = require('../../../integration/lulc/TransportationNetwork');

describe('TransportationNetwork', () => {
    describe('#geojson', ()=> {
        it('returns valid GeoJson with updated properties', async done => {
            try {
                let au = await fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_AL1.geojson', 'utf8');
                au = JSON.parse(au);

                let transportationSource = await fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_TRANSPORT_2017.geojson', 'utf8');
                transportationSource = JSON.parse(transportationSource);

                const attributesL1 = [{
                    id: 1,
                    code: 50,
                    columnName: 'CT_L1'
                }, {
                    id: 2,
                    code: 40,
                    columnName: 'CT_L1'
                }, {
                    id: 5,
                    code: [10, 20, 50],
                    columnName: 'CT_L1'
                }, {
                    id: 6,
                    columnName: 'CT_L1'
                }];

                const result = await new TransportationNetwork(attributesL1, au, transportationSource).geoJson();

                const properties = result.features[0].properties;
                should(properties[1]).be.exactly(196.1789359332438);
                should(properties[2]).be.exactly(8403.631255354247);
                should(properties[5]).be.exactly(1483.724474668315);
                should(properties[6]).be.exactly(2768.6264373263098);

                done();
            } catch(error) {
                done(error);
            }
        })
    })
});