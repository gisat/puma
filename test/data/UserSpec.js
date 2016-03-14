var should = require('should');

var conn = require('../../common/conn');
var config = require('../config');
var User = require('../../data/User').User;
var TestUser = require('./TestUser').TestUser;

describe('User', function(){
    var testUser,
        loadedUser;

    before(function(){
        // TODO: Prepare layer and permission in the database.
        conn.initDatabases(config.pgDataConnMap, config.pgGeonodeConnString, config.mongoConnString, function(){});
        
        testUser = new TestUser();
        testUser.save().then(function(){
            User.load(testUser.getId()).then(function(loaded){
                loadedUser = loaded;
                done();
            }, function(error){
                done();
                throw new Error(error);
            });
        });
    });
    
    describe('#load', function(){
        context('When user with given Id exists', function(){
            it('correctly constructs valid user', function(){
                should.exist(loadedUser);

                should(loadedUser).have.property('email', 'test@test.test');
                should(loadedUser).have.property('username', 'testTest');
            });

            it('loads permissions of this user', function(){
                should.exist(loadedUser);
                
                should(loadedUser.permissions).have.length(1);
            });
        });
    });

    describe('#hasPermissionToLayer', function(){
        context('When user has read rights to the layer', function(){
            it('returns true', function(){
                should.exist(loadedUser);

                should(loadedUser.hasPermissionToLayer(createdLayerName, 'viewResource')).equal(true);
            });
        });

        context("When user doesn't have Read Rights to the layer", function(){
            it('returns false', function(){
                should(loadedUser.hasPermissionToLayer(createdLayerName, 'viewResource')).equal(true);
            });
        });
    });

    after(function(){
        testUser.remove();
    });
});