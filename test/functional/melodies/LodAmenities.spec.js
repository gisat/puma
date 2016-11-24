var should = require('should');

var config = require('../config');
var logger = require('../../../common/Logger').applicationWideLogger;

var LodAmenities = require('../../../melodies/LodAmenities');

describe('LodAmenities', function(){
    it('loads schools', function(done){
        this.timeout(60000);
        var schools = new LodAmenities('School', '4.892222, 52.373056', 1);

        schools.json().then(function(results){
            console.log(results);
            done();
        }).catch(function(error){
            logger.error('LodAmenities Error: ', error);
            done();
        })
    });

    it('loads hospitals', function(done){
        this.timeout(60000);
        var schools = new LodAmenities('Hospital', '4.892222, 52.373056', 1);

        schools.json().then(function(results){
            console.log(results);
            done();
        }).catch(function(error){
            logger.error('LodAmenities Error: ', error);
            done();
        })
    });

    it('loads public stops', function(done){
        this.timeout(60000);
        var schools = new LodAmenities('StopPosition', '4.892222, 52.373056', 1);

        schools.json().then(function(results){
            console.log(results);
            done();
        }).catch(function(error){
            logger.error('LodAmenities Error: ', error);
            done();
        })
    });
});