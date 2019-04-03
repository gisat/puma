class Group {
    constructor(id, permissions, name, identifier, created, createdBy, changed, changedBy) {
        this.id = id;
        this.permissions = permissions;
        this.name = name;
        this.identifier = identifier;

        this.created = created;
        this.createdBy = createdBy;
        this.changed = changed;
        this.changedBy = changedBy;
    }

    hasPermission(resourceType, permissionType, resourceId) {
        return this.permissions
                .filter(permission => permission.resourceType == resourceType && permission.permission == permissionType && (permission.resourceId == resourceId || !resourceId))
                .length > 0;
    }

    json() {
        return {
            _id: this.id,
            name: this.name,
            identifier: this.identifier,
            created: this.created,
            createdBy: this.createdBy,
            changed: this.changed,
            changedBy: this.changedBy,
            permissions: this.permissions
        }
    }

    static userId() {
        return 3;
    }

    static guestId() {
        return 2;
    }

    static adminId() {
        return 1;
    }
}

module.exports = Group;