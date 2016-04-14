var expect    = require("chai").expect;

var conn = require('../../../../common/conn');

describe('Given User exists in Geonode', function(){
    var user,
        resource;

    before(function(){
        var connection = conn.getPgGeonodeDb();
        var createUser = "INSERT into "
    });

    describe('and resource exists in Geonode', function(){
        describe('and resource exists in Puma', function(){
            describe('and user has rights toward the resource', function(){
                context('When user tries to access it', function(){
                    it('Then allow him to do so', function(){
                        
                    });
                });
            });
            
            describe('and user doesnt have rights toward the resource', function(){
                context('When user tries to access it', function(){
                    it('Then forbid him to do so', function(){

                    });
                });
            });
        })
    });

    after(function(){

    });
});