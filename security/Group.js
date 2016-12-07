class Group {
    constructor(id, permissions, name, created, createdBy, changed, changedBy) {
        this.id = id;
        this.permissions = permissions;
        this.name = name;

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
            created: created,
            createdBy: createdBy,
            changed: changed,
            changedBy: changedBy
        }
    }

    static guestId() {
        return 2;
    }

    static adminId() {
        return 1;
    }
}

module.exports = Group;