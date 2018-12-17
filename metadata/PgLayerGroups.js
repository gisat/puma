const PgCollection = require('../common/PgCollection');

class PgLayerGroups extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgLayerGroups`);

		this._legacy = true;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
		    `layergroup`
		]
	}

	static collectionName() {
		return 'layergroup';
	}

	static groupName() {
		return 'layergroups';
	}

	static tableName() {
		return 'layer_group';
	}
}

module.exports = PgLayerGroups;