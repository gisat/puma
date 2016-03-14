/**
 * This module is responsible for retrieving rights for different elements from the GeoNode.
 *
 * It supports access restriction based on the layers. It isn't possible to filter access on more granular level.
 */
// Dependencies for this module.
var conn = require('../conn');
var pg = require('pg');
var config = require('../config');

/**
 * Support class for authentication based on the database in the Geonode.
 * @constructor
 */
var GeonodeBasedAuthentication = function() {

};

/**
 * It decides whether user is authorized to see this resource.
 * @param user {Number} Id of the user
 * @param resource {Number} Id of the resource
 */
GeonodeBasedAuthentication.prototype.authorize = function(user, resource) {
    // Retrieve all permissions towardgiven resource.
    var retrieveUserRights = 'SELECT permission_id ' +
        'FROM guardian_userobjectpermission where user_id = $1 and object_pk = $2';
    conn.pgGeonodeDbClient(function(err, connection, release){
        if(err) {
            // Log Error and return no rights
            return false;
        }
        connection.query(retrieveUserRights, [user, resource], function(err, result){
            release();

            if(err) {
                // Log Error and return no rights
                return false;
            }

            if(!result.rows || !result.rows.length) {
                return false;
            }


            var rightsTowardsResource = result.rows.map(function(row){

            });
        });
    });
};

// Return Promise.
GeonodeBasedAuthentication.prototype.canEdit = function(user, resource) {
    var promiseOfRights = this.authorize(user, resource);


};

/**
 * This object contains rights available in the database
 * @constructor
 */
var GeonodeResourceRights = function() {
    var retrievePermissions = 'SELECT codename FROM auth_permission';
    conn.pgGeonodeDbClient(function(err, connection, release){
        connection.query(retrievePermissions, [], function(err, result){
            release();
        });
    });

    this._permissions = [];
};

GeonodeResourceRights.prototype.canEdit = function() {

};

GeonodeResourceRights.prototype.canAdd = function() {

};

GeonodeResourceRights.prototype.canRemove = function() {

};

module.exports = {
    Authentication: GeonodeBasedAuthentication
};
