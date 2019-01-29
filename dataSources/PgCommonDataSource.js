const _ = require(`lodash`);

const PgCollection = require(`../common/PgCollection`);

const PgVector = require(`./PgVector`);
const PgRaster = require(`./PgRaster`);
const PgWms = require(`./PgWms`);
const PgWmts = require(`./PgWmts`);

class PgCommonDataSource extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._basePermissionResourceType = `dataSource`;

		this._permissionResourceTypes = [
			this._basePermissionResourceType
		];

		this._pgVector = new PgVector(pgSchema);
		this._pgRaster = new PgRaster(pgSchema);
		this._pgWms = new PgWms(pgSchema);
		this._pgWmts = new PgWmts(pgSchema);

		this._dataSources = {
			[this._pgVector.getType()]: this._pgVector,
			[this._pgRaster.getType()]: this._pgRaster,
			[this._pgWms.getType()]: this._pgWms,
			[this._pgWmts.getType()]: this._pgWmts
		};

		this._relevantColumns = [
			`key`,
			`nameInternal`,
			`attribution`,
			`type`
		];

		this._relatedColumns = {
			sourceKey: `key`
		};
	}

	getTableSql() {
		let sql = [
			`
			BEGIN;
			
			CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
				"key" UUID PRIMARY KEY DEFAULT gen_random_uuid()
			);
			ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "nameInternal" TEXT;
			ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "attribution" TEXT;		
			ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "type" TEXT;		
			ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "sourceKey" UUID;		
			COMMIT;
			`
		];

		_.each(this._dataSources, (dataSource) => {
			sql.push(dataSource.getTableSql());
		});

		return sql.join(`\n`);
	}

	static groupName() {
		return 'dataSources';
	}

	static tableName() {
		return 'dataSource';
	}
}

module.exports = PgCommonDataSource;