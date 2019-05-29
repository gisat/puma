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

                const geoJsonResult = new LulcProcessor(attributesL1, analyticalUnits, lulc, 'lulc').geoJson();

                should(geoJsonResult.features.length).be.exactly(1);
                should(geoJsonResult.features[0].properties[1]).be.exactly(1432877662.6869395);
                should(geoJsonResult.features[0].properties[2]).be.exactly(282583398.1447872);
                should(geoJsonResult.features[0].properties[3]).be.exactly(78266683.84868865);
                should(geoJsonResult.features[0].properties[4]).be.exactly(0);
                should(geoJsonResult.features[0].properties[5]).be.exactly(1511144346.535628);
                should(geoJsonResult.features[0].properties[6]).be.exactly(324790623.7087087);

                done();
            }).catch(err => {
                done(err);
            });
        });
    })
});