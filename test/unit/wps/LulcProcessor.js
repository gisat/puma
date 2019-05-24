const fs = require('fs').promises;

const LulcProcessor = require('../../../integration/lulc/LulcProcessor');

describe('LulcProcessor', () => {
    describe('#oneLevel', () => {
        it('Provides valid areas per level', function(done) {
            let analyticalUnits, lulc;
            const attributesL1 = [{
                id: 1,
                code: 10000
            }, {
                id: 2,
                code: 20000
            }, {
                id: 3,
                code: 30000
            }, {
                id: 4,
                code: 40000
            }];


            fs.readFile('./test/unit/wps/integrateCity/EO4SD_BHOPAL_AL2.geojson', 'utf8').then(auLevel => {
                analyticalUnits = JSON.parse(auLevel);

                return fs.readFile('./test/unit/wps/integrateCity/EO4SD_BHOPAL_LULCVHR_2017.geojson', 'utf8');
            }).then(geojson => {
                lulc = JSON.parse(geojson);

                const geoJsonResult = new LulcProcessor(attributesL1, analyticalUnits, lulc, 'C_L1', 'lulc').geoJson();
                console.log(geoJsonResult);

                done();
            }).catch(err => {
                done(err);
            });
        });
    })
});