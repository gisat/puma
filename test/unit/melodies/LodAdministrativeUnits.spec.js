var should = require('should');

var config = require('../config');
var logger = require('../../../common/Logger').applicationWideLogger;

var LodAdministrativeUnits = require('../../../melodies/LodAdministrativeUnits');

describe('LodAdministrativeUnits', function() {
    it('downloads information from the Lod endpoint', function(done){
        var unit = new LodAdministrativeUnits("Prague");

        unit.json().then(function(units){
            should(units.length).be.exactly(22);
            console.log(units);
            done();
        }).catch(function(err) {
            logger.error('LodAdministrativeUnitsSpec Error: ', err);
            should(true).equal(false);
            done();
        })
    });
});