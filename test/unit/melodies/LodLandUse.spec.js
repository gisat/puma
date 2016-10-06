var should = require('should');

var config = require('../config');
var logger = require('../../../common/Logger').applicationWideLogger;

var LodLandUse = require('../../../melodies/LodLandUse');
var LodAdministrativeUnits = require('../../../melodies/LodAdministrativeUnits');

describe('LodLandUse', function() {
    it('downloads information from the Lod endpoint', function(done){
        this.timeout(60000);

        var units = new LodAdministrativeUnits("Prague");
        var landUse = new LodLandUse(units);

        landUse.json().then(function(polygons){
            console.log(polygons);
            should(polygons.length).be.exactly(22);
            done();
        }).catch(function(err) {
            logger.error('LodLandUse Error: ', err);
            done();
        })
    });
});