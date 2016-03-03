var should = require('should');

var conn = require('../../common/conn');
var config = require('../config');
var User = require('../../data/User').User;
var TestUser = require('./TestUser').TestUser;

describe('User', function(){
    before(function(){
        conn.initDatabases(config.pgDataConnString, config.pgGeonodeConnString, config.mongoConnString, function(){})
    });
    
    describe('#load', function(){
        context('When user with given Id exists', function(){
            var testUser,
                loadedUser;
            before(function(done){
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

            it('correctly constructs valid user', function(){
                should.exist(loadedUser);

                should(loadedUser).have.property('email', 'test@test.test');
                should(loadedUser).have.property('username', 'testTest');
            });

            it('loads permissions of this user', function(){
                should.exist(loadedUser);
                
                should(loadedUser.permissions).have.length(1);
            });

            after(function(){
                testUser.remove();
            });
        })
    });
});