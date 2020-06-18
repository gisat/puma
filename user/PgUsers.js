const bcrypt = require(`bcrypt`);
const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgUsers extends PgCollection {
	constructor(pool, schema) {
		super(pool, schema, `PgUsers`);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._allowMultipleRelations = true;

		this._permissionResourceTypes = [
			`user`
		];
	}

	// modifyColumnsAndValuesBeforeInsert(columns, values) {
	// 	_.each(columns, (column, index) => {
	// 		if(column === `password`) {
	// 			// values[index] = bcrypt.hashSync(values[index], 10);
	// 			values[index] = `crypt('${values[index]}', gen_salt('bf')`;
	// 		}
	// 	});
	// 	return [columns, values];
	// }

	parsePostgresRow(row) {
		let data = {
			...row
		};

		delete data.key;
		delete data.total;
		delete data.password;

		return {
			key: row.key,
			data
		};
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" ${this._keyType} PRIMARY KEY DEFAULT gen_random_uuid(),
			"email" TEXT UNIQUE
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "name" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "password" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "phone" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "other" JSONB;
		INSERT INTO "${this._pgSchema}"."${this._tableName}"("key", "name") VALUES ('cad8ea0d-f95e-43c1-b162-0704bfc1d3f6', 'guest') ON CONFLICT ("key") DO NOTHING;
		COMMIT;
		`;
	}

	static groupName() {
		return 'users';
	}

	static tableName() {
		return 'users';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgUsers;