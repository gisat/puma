var Promise = require('promise');
var conn = require('../common/conn');
var Permissions = require('./Permissions').Permissions;

/**
 * Constructor function for user as defined in the Geonode.
 * @constructor
 */
var User = function(email, username, firstName, lastName, password, isSuperuser, lastLogin, isActive, isStaff, dateJoined, permissions) {
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
    this.permissions = permissions;
};

/**
 * Use this method to decide whether user can do certain action with a layer. 
 * @param layerName {String} Name of the layer in format workspace:name for example geonode:layer_name
 * @param permissionToAskFor {String} One of the possible values: addResource, updateResource, removeResource, viewResource
 * @returns {Promise} Promise of information about permission
 */
User.prototype.hasPermissionToLayer = function(layerName, permissionToAskFor) {
    var self = this;
    return new Promise(function(resolve, reject){
        var getLayerEquivalentInGeonode = "select * from layers_layer where typename = $1";
        conn.pgGeonodeDbClient(function(err, connection, release){
            if(err){
                return reject(err);
            }
            connection.query(getLayerEquivalentInGeonode, [layerName], function(err, results){
                release();

                if(err){
                    reject(err);
                    return;
                }

                if(!results.rows) {
                    reject(err);
                    return;
                }

                var idOfLayer = results.rows[0].resourcebase_ptr_id;
                var hasRights = false;
                self.permissions.forEach(function(permission){
                    if(permission.objectPk == idOfLayer) {
                        if(permission[permissionToAskFor] == permission.permissionId) {
                            hasRights = true
                        }
                    }
                });
                resolve(hasRights);
            });
        });
    });
};

/**
 * Static function used to load the user.
 * @param id {Number} Identification of the user.
 */
User.load = function(id) {
    return new Promise(function(resolve, reject){
        var loadUserSql = "SELECT * FROM people_profile where id = $1;";
        conn.pgGeonodeDbClient(function(err, connection, release){
            if(err) {
                return reject(err);
            }
            connection.query(loadUserSql, [id], function(err, results){
                release();

                if(err) {
                    reject(err);
                    return;
                }

                if(results.rows.length == 0) {
                    reject('There is no user with id.' + id);
                    return;
                }

                var result = results.rows[0];
                Permissions.loadForUser(id).then(function(permissions){
                    resolve(new User(result.email, result.username, result.first_name, result.last_name, result.password,
                        result.is_superuser, result.last_login, result.is_active, result.is_staff, result.date_joined,
                        permissions));
                });
            });
        });
    });
};

module.exports = {
    User: User
};