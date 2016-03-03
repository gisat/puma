var Promise = require('promise');
var conn = require('../common/conn');

var Permissions = function() {

};

Permissions.loadForUser = function(userId) {
    var connection = conn.getPgGeonodeDb();
    return new Promise(function(resolve, reject) {
        var loadPermissionsForUser = "SELECT * from guardian_userobjectpermission where user_id = $1";
        connection.query(loadPermissionsForUser, [userId], function(err, result){
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
};

var Permission = function(permissionId, objectPk, userId) {
    this.permissionId = permissionId;
    this.objectPk = objectPk;
    this.userId = userId;
};

module.exports = {
    Permissions: Permissions
};