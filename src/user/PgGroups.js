const PgCollection = require('../common/PgCollection');

class PgGroups extends PgCollection {
	constructor(pool, schema) {
		super(pool, schema, null, `PgGroups`);

		this._legacy = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
			`group`
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
		return 'groups';
	}

	static groupName() {
		return 'groups';
	}

	static tableName() {
		return 'groups';
	}
}

module.exports = PgGroups;