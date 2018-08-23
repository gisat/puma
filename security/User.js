/**
 * Synchronous internal object representing the User.
 * @alias User
 * @constructor
 */
class User {
    constructor(id, permissions, groups) {
        this.id = id;
        this.permissions = permissions || [];
        this.permissionsUsers = [];
        this.permissionsGroups = [];
        this.permissionsTowards = [];
        this.groups = groups || [];
        this._username = '';
        this._email = '';
        this._phone = '';
    }

    get username() {
        return this._username;
    }

    set username(value) {
        this._username = value;
    }

    get email() {
        return this._email;
    }

    set email(value) {
        this._email = value;
    }

    get phone() {
        return this._phone;
    }

    set phone(value) {
        this._phone = value;
    }

    /**
     * It returns whether user has correct type of permission toward correct resource. For the resources which aren't important.
     * @param resourceType {String}
	 * @param permissionType {String} Type of permission to query
	 * @param resourceId {Number} Optional. It can be omitted. In this case we aren't matching against the id.
     * @returns {boolean}
     */
    hasPermission(resourceType, permissionType, resourceId) {
        let isAdmin = this.groups.filter(group => group.name == "admin").length > 0;
        // If either of group has permissions
        let hasAnyGroupPermission = this.groups.filter(group => group.hasPermission(resourceType, permissionType, resourceId)).length > 0;

        return isAdmin || hasAnyGroupPermission || this.permissions
                .filter(permission => permission.resourceType == resourceType && permission.permission == permissionType && (permission.resourceId == resourceId || !resourceId))
                .length > 0;
    }

    json() {
        return {
            _id: this.id,
            permissions: this.permissions,
            permissionsUsers: this.permissionsUsers,
            permissionsGroups: this.permissionsGroups,
            permissionsTowards: this.permissionsTowards,
            groups: this.groups.map(group => group.json()),
            username: this.username,
            email: this.email,
            phone: this.phone
        }
    }

    static guestId() {
        return 0;
    }
}

module.exports = User;