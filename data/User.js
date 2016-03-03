var Promise = require('promise');
var conn = require('../common/conn');

/**
 * Constructor function for user as defined in the Geonode.
 * @constructor
 */
var User = function(email, username, firstName, lastName, password, isSuperuser, lastLogin, isActive, isStaff, dateJoined) {
    this.email = email;
    this.username = username;
    this.firstName = firstName;
    this.lastName = lastName;
    this.password = password;
    this.isSuperuser = isSuperuser;
    this.lastLogin = lastLogin;
    this.isActive = isActive;
    this.isStaff = isStaff;
    this.dateJoined = dateJoined;
};

User.prototype.save = function() {
    var connection = conn.getPgGeonodeDb();
    // Apply defaults to remaining fields.
};

/**
 * Static function used to load the user.
 * @param id {Number} Identification of the user.
 */
User.load = function(id) {
    var connection = conn.getPgGeonodeDb();
    return new Promise(function(resolve, reject){
        var loadUserSql = "SELECT * FROM people_profile where id = $1;";
        connection.query(loadUserSql, [id], function(err, results){
            if(err) {
                reject(err);
                return;
            }

            if(results.rows.length == 0) {
                reject('There is no user with id.' + id);
                return;
            }

            var result = results.rows[0];
            resolve(new User(result.email, result.username, result.first_name, result.last_name, result.password,
                result.is_superuser, result.last_login, result.is_active, result.is_staff, result.date_joined));
        });
    });
};

module.exports = {
    User: User
};