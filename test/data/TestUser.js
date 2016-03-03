var conn = require('../../common/conn');
var Promise = require('promise');

var TestUser = function() {
    this._id = null;
    this._connection = conn.connectToPgDb('postgres://geonode:TheGeoNodeBigFan@37.205.9.78:5432/geonode');
};

TestUser.prototype.save = function(){
    var createUser = "INSERT into people_profile (first_name, last_name, is_superuser, password, username, " +
        "       email, last_login, is_staff, is_active, date_joined) " +
        "   values ('', '',false, 'pbkdf2_sha256$12000$FIppmPcnkO1r$XkhZGysWDOMKsuwsFEUdJMSQmwwn9lKPtH6zCiTeeWs='," +
        "       'testTest','test@test.test',now(), false,true, now()) RETURNING id;";
    var self = this;
    return new Promise(function(resolve, reject) {
        self._connection.query(createUser, function(err, result){
            if(err){
                reject(err);
            }
            self._id = result.rows[0].id;
            resolve();
        });
    });
};

TestUser.prototype.remove = function() {
    var deleteUser = "DELETE FROM people_profile where email = 'test@test.test'";
    this._connection.query(deleteUser, function(err){
        if(err){
            throw new Error(err);
        }
    });
};


TestUser.prototype.getId = function(){
    return this._id;
};

module.exports = {
    TestUser: TestUser
};