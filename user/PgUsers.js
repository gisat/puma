const bcrypt = require(`bcrypt`);

const PgCollection = require('../common/PgCollection');

class PgUsers extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgUsers`);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._permissionResourceTypes = [
			`user`
		];
	}

	modifyColumnsAndValuesBeforeInsert(columns, values) {

		_.each(columns, (column, index) => {
			if(column === `password`) {
				values[index] = bcrypt.hashSync(values[index], 10);
			}
		});

		return [columns, values];
	}

	parsePostgresRow(row) {
		let data = {
			...row
		};

		delete data.key;
		delete data.id;
		delete data.uuid;
		delete data.total;
		delete data.created;
		delete data.password;
		delete data.created_by;
		delete data.changed;
		delete data.changed_by;

		return {
			key: row.key,
			id: row.id,
			data
		};
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" ${this._keyType} PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "name" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "email" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "password" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "phone" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "key" ${this._keyType} DEFAULT gen_random_uuid();
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "id" SERIAL;
		COMMIT;
		`;
	}

	static groupName() {
		return 'users';
	}

	static tableName() {
		return 'panther_users';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgUsers;