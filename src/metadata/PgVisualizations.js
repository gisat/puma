const PgCollection = require('../common/PgCollection');

class PgVisualizations extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgVisualizations`);

		this._legacy = true;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
		    `visualization`
		]
	}

	parseMongoDocument(document) {
		return {
			key: document._id,
			data: {
				...document,
				_id: undefined,
				changed: undefined,
				changedBy: undefined,
				created: undefined,
				createdBy: undefined,
				options: undefined,
				permissions: undefined
			}
		}
	}

	static collectionName() {
		return 'visualization';
	}

	static groupName() {
		return 'visualizations';
	}

	static tableName() {
		return 'visualization';
	}
}

module.exports = PgVisualizations;