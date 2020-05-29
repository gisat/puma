const PgCollection = require('../common/PgCollection');

class PgUserGroups extends PgCollection {
    constructor(pool, schema) {
        super(pool, schema, `PgUsers`);

        this._checkPermissions = false;

        this._groupName = this.constructor.groupName();
        this._tableName = this.constructor.tableName();

        this._allowMultipleRelations = true;

        this._permissionResourceTypes = [`user`];
    }

    getTableSql() {
        return `
        BEGIN;
        CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
            "userKey" UUID REFERENCES "${this._pgSchema}"."users"("key") ON DELETE CASCADE,
            "groupKey" UUID REFERENCES "${this._pgSchema}"."groups"("key") ON DELETE CASCADE,
            PRIMARY KEY ("userKey", "groupKey")
        );
        COMMIT;
        `;
    }

    static groupName() {
        return 'users';
    }

    static tableName() {
        return 'userGroups';
    }
}

module.exports = PgUserGroups;
