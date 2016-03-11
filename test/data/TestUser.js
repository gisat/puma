var conn = require('../../common/conn');
var Promise = require('promise');

var TestUser = function() {
    this._id = null;
    this._connectionPool = conn.createPgPool('postgres://geonode:TheGeoNodeBigFan@37.205.9.78:5432/geonode');
};

TestUser.prototype.save = function(){
    var createUser = "INSERT into people_profile (first_name, last_name, is_superuser, password, username, " +
        "       email, last_login, is_staff, is_active, date_joined) " +
        "   values ('', '',false, 'pbkdf2_sha256$12000$FIppmPcnkO1r$XkhZGysWDOMKsuwsFEUdJMSQmwwn9lKPtH6zCiTeeWs='," +
        "       'testTest','test@test.test',now(), false,true, now()) RETURNING id;";
    var self = this;
    return new Promise(function(resolve, reject) {
        self._connectionPool.acquire(function(err, connection){
            if(err){
                reject(err);
            }
            connection.query(createUser, function(err, result){
                if(err){
                    reject(err);
                }
                self._id = result.rows[0].id;
                var createPermissions = "INSERT INTO guardian_userobjectpermission (permission_id, object_pk, user_id, content_type_id) " +
                  " VALUES (115, 15, $1, 38);";
                connection.query(createPermissions, [self._id], function(err, result){
                    if(err) {
                        reject(err);
                    }

                    resolve();
                    self._connectionPool.release(connection);
                });
            });
        });
    });
};

TestUser.prototype.remove = function() {
    var deletePermissions = "DELETE FROM guardian_userobjectpermission where user_id = $1";

    var deleteUser = "DELETE FROM people_profile where id = $1";
    var self = this;
    self._connectionPool.acquire(function(err, connection){
        if(err){
            reject(err);
        }
        connection.query(deletePermissions, [this.getId()], function(err){
            if(err){
                throw new Error(err);
            }

            connection.query(deleteUser, [self.getId()], function(err){
                if(err){
                    throw new Error(err);
                }
                self._connectionPool.release(connection);
            })
        });
    });
};


TestUser.prototype.getId = function(){
    return this._id;
};

module.exports = {
    TestUser: TestUser
};