const fs = require('fs').promises;
const should = require('should');

const PopulationProcessor = require('../../../integration/lulc/PopulationProcessor');

describe('PopulationProcessor', () => {
    describe('#oneLevel', () => {
        it('Provides valid areas per level', function(done) {
            const MINUTE = 60000;
            this.timeout(MINUTE);

            let analyticalUnits, population;
            const attributesL1 = [{
                id: 1,
                columnName: 'POP'
            }];


            fs.readFile('./test/unit/integration/integrateCity/EO4SD_ARUSHA_AL3.geojson', 'utf8').then(auLevel => {
                analyticalUnits = JSON.parse(auLevel);

                return fs.readFile('./test/unit/integration/integrateCity/EO4SD_ARUSHA_POP_2015.geojson', 'utf8');
            }).then(geojson => {
                population = JSON.parse(geojson);

                const geoJsonResult = new PopulationProcessor(attributesL1, analyticalUnits, population).geoJson();

                should(geoJsonResult.features[0].properties[1]).be.exactly(96820);

                done();
            }).catch(err => {
                done(err);
            });
        });
    })
});