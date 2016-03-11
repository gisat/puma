var Promise = require('promise');
var conn = require('../common/conn');

var Permissions = function() {

};

Permissions.loadForUser = function(userId) {
    return new Promise(function(resolve, reject) {
        var loadPermissionsForUser = "SELECT * from guardian_userobjectpermission where user_id = $1";
        conn.pgGeonodeDbClient(function(err, connection, release){
            connection.query(loadPermissionsForUser, [userId], function(err, result){
                release();

                if(err){
                    reject(err);
                    return;
                }

                if(!result.rows) {
                    reject("Some error with retrieving rows for Permissions for user with id " + userId);
                    return;
                }

                resolve(result.rows.map(function(permissionRow){
                    return new Permission(permissionRow.permission_id, permissionRow.object_pk, permissionRow.user_id);
                }));
            });
        });
    });
};

var Permission = function(permissionId, objectPk, userId) {
    this.permissionId = permissionId;
    this.objectPk = objectPk;
    this.userId = userId;
};

// Ids of rights relevant for current moment in the Panther application.
// TODO: Load this information from the table auth_permission
Permission.prototype.addResource = 112;
Permission.prototype.updateResource = 113;
Permission.prototype.removeResource = 114;
Permission.prototype.viewResource = 115;

module.exports = {
    Permissions: Permissions
};