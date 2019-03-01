const PgCollection = require('../common/PgCollection');

class PgUsers extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgUsers`);

		this._legacy = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
			`user`
		];
	}

	parsePostgresRow(row) {
		return {
			key: row.key,
			uuid: row.uuid,
			data: {
				...row,
				key: undefined,
				id: undefined,
				uuid: undefined,
				password: undefined,
				created: undefined,
				created_by: undefined,
				changed: undefined,
				changed_by: undefined
			}
		}
	}

	static collectionName() {
		return 'panther_users';
	}

	static groupName() {
		return 'users';
	}

	static tableName() {
		return 'panther_users';
	}
}

module.exports = PgUsers;