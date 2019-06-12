const fs = require('fs').promises;
const should = require('should');

const LulcProcessor = require('../../../integration/lulc/LulcProcessor');

describe('LulcProcessor', () => {
    describe('#oneLevel', () => {
        it('Provides valid areas per level', function(done) {
            const MINUTE = 60000;
            this.timeout(MINUTE);

            let analyticalUnits, lulc;
            const attributesL1 = [{
                id: 1,
                code: 10000,
                columnName: 'C_L1'
            }, {
                id: 2,
                code: 20000,
                columnName: 'C_L1'
            }, {
                id: 3,
                code: 30000,
                columnName: 'C_L1'
            }, {
                id: 4,
                code: 40000,
                columnName: 'C_L1'
            }, {
                id: 5,
                code: [10000, 30000, 40000],
                columnName: 'C_L1'
            }, {
                id: 6,
                columnName: 'C_L1'
            }];


            fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_AL1.geojson', 'utf8').then(auLevel => {
                analyticalUnits = JSON.parse(auLevel);

                return fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_LULCVHR_2017.geojson', 'utf8');
            }).then(geojson => {
                lulc = JSON.parse(geojson);

                const geoJsonResult = new LulcProcessor(attributesL1, analyticalUnits, lulc, 1).geoJson();

                should(geoJsonResult.features.length).be.exactly(1);
                should(geoJsonResult.features[0].properties[1]).be.exactly(238480653.6101068);
                should(geoJsonResult.features[0].properties[2]).be.exactly(47031700.79625395);
                should(geoJsonResult.features[0].properties[3]).be.exactly(13026296.947628893);
                should(geoJsonResult.features[0].properties[4]).be.exactly(0);
                should(geoJsonResult.features[0].properties[5]).be.exactly(251506950.55773565);
                should(geoJsonResult.features[0].properties[6]).be.exactly(324338702.1254758);

                done();
            }).catch(err => {
                done(err);
            });
        });
    })
});