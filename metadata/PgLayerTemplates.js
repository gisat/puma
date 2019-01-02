const PgCollection = require('../common/PgCollection');

class PgLayerTemplates extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgLayerTemplates`);

		this._legacy = true;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
		    `areatemplate`,
			`layer_template`
		]
	}

	static collectionName() {
		return 'areatemplate';
	}

	static groupName() {
		return 'layertemplates';
	}

	static tableName() {
		return 'layer_template';
	}
}

module.exports = PgLayerTemplates;