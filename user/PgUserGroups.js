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
        INSERT INTO "${this._pgSchema}"."${this._tableName}"
          ("userKey", "groupKey")
        VALUES
          ('cad8ea0d-f95e-43c1-b162-0704bfc1d3f6', '52ddabec-d01a-49a0-bb4d-5ff931bd346e'),
          ('cad8ea0d-f95e-43c1-b162-0704bfc1d3f6', 'e56f3545-57f5-44f9-9094-2750a69ef67e')
        ON CONFLICT ("userKey", "groupKey") DO NOTHING;
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
