const _ = require(`lodash`);

class PgMetadataRelations {
	constructor(pgPool, pgSchema, baseStore, relatedStores) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;

		this._baseStore = baseStore;
		this._baseMetadataType = baseStore.getTableName();
		this._relatedToStores = relatedStores;

		this._initPgTable();
	}

	addRelations(baseKey, relations) {
		let transactionSql = [
			`BEGIN;`
		];
		let insertSql = [];
		let deleteSql = [];

		let relatedStoresOptions = {};
		_.each(this._relatedToStores, (relatedStore) => {
			let allowMultipleRelations = relatedStore.isAllowMultipleRelations();
			let relatedStoreSqlColumName = `${relatedStore.getTableName()}Key`;
			let relatedStoreColumName = `${relatedStore.getTableName()}${allowMultipleRelations ? 'Keys' : 'Key'}`;

			relatedStoresOptions[relatedStoreColumName] = {
				relatedStoreSqlColumName,
				allowMultipleRelations
			};
		});

		_.each(relations, (value, property) => {
			let relatedStoreOptions = relatedStoresOptions[property];

			deleteSql.push(`DELETE FROM "${this._pgSchema}"."${this._getTableName()}" AS "${this._getTableName()}" WHERE`);
			deleteSql.push(`"${this._getTableName()}"."${this._getBaseMetadataTypeColumnName()}" = '${baseKey}'`);
			deleteSql.push(`AND "${this._getTableName()}"."${relatedStoreOptions.relatedStoreSqlColumName}" IS NOT NULL;`);

			if (relatedStoreOptions && relatedStoreOptions.allowMultipleRelations && _.isArray(value)) {
				_.each(value, (relationKey) => {
					insertSql.push(`INSERT INTO "${this._pgSchema}"."${this._getTableName()}"`);
					insertSql.push(`("${this._getBaseMetadataTypeColumnName()}", "${relatedStoreOptions.relatedStoreSqlColumName}")`);
					insertSql.push(`VALUES ('${baseKey}', '${relationKey}');`);
				})
			} else if (relatedStoreOptions) {
				insertSql.push(`INSERT INTO "${this._pgSchema}"."${this._getTableName()}"`);
				insertSql.push(`("${this._getBaseMetadataTypeColumnName()}", "${relatedStoreOptions.relatedStoreSqlColumName}")`);
				insertSql.push(`VALUES ('${baseKey}', '${value}');`);
			}
		});

		transactionSql = _.concat(transactionSql, deleteSql);
		transactionSql = _.concat(transactionSql, insertSql);

		transactionSql.push(`COMMIT;`);

		return this._pgPool
			.query(transactionSql.join(` `))
			.catch((error) => {
				console.log(error);
			})
	}

	updateRelations(baseKey, relations) {
		return this.addRelations(baseKey, relations);
	}

	deleteRelations(baseKey) {
		return this._pgPool
			.query(`DELETE FROM "${this._pgSchema}"."${this._getTableName()}" AS "${this._getTableName()}" WHERE "${this._getTableName()}"."${this._getBaseMetadataTypeColumnName()}" = '${baseKey}'`);
	}

	getRelationsForBaseKeys(baseKeys) {
		return this._pgPool
			.query(`SELECT "${this._getBaseMetadataTypeColumnName()}", ${this.getMetadataTypeKeyColumnNamesSql().join(`, `)} FROM "${this._pgSchema}"."${this._getTableName()}" WHERE "${this._getBaseMetadataTypeColumnName()}" IN ('${baseKeys.join(`', '`)}') GROUP BY "${this._getBaseMetadataTypeColumnName()}"`)
			.then((pgResult) => {
				let relations;

				_.each(pgResult.rows, (row) => {
					relations = {
						...relations
					};

					relations[row[this._getBaseMetadataTypeColumnName()]] = {
						...row
					};

					delete relations[row[this._getBaseMetadataTypeColumnName()]][this._getBaseMetadataTypeColumnName()];
				});

				return relations;
			})
			.catch((error) => {
				console.log(error);
			})
	}

	getBaseKeysByRelations(relations) {
		return this._pgPool
			.query(`SELECT "${this._getBaseMetadataTypeColumnName()}" FROM "${this._pgSchema}"."${this._getTableName()}" WHERE ${_.map(relations, (value, property) => {
				return `"${property}" = '${value}'`
			}).join(` AND `)};`)
			.then((result) => {
				return _.map(result.rows, (row) => {
					return row[this._getBaseMetadataTypeColumnName()];
				});
			})
	}

	getMetadataTypeKeyColumnNames() {
		return _.map(this._relatedToStores, (metadataStore) => {
			return `${metadataStore.getTableName()}Key${metadataStore.isAllowMultipleRelations() ? 's' : ''}`;
		});
	}

	getMetadataTypeKeyColumnNamesSql() {
		return _.map(this._relatedToStores, (metadataStore) => {
			if (metadataStore.isAllowMultipleRelations()) {
				return `array_agg("${metadataStore.getTableName()}Key") FILTER (WHERE "${metadataStore.getTableName()}Key" IS NOT NULL) AS "${metadataStore.getTableName()}Keys"`;
			} else {
				return `string_agg("${metadataStore.getTableName()}Key"::TEXT, '') AS "${metadataStore.getTableName()}Key"`;
			}
		});
	}

	_initPgTable() {
		return this._pgPool
			.query(this._getTableSql())
			.catch((error) => {
				console.log(error);
			})
	}

	_getBaseMetadataTypeColumnName() {
		return `${this._baseStore.getTableName()}Key`;
	}

	_getTableName() {
		return `${this._baseStore.getTableName()}Relation`;
	}

	_getTableSql() {
		let sql = [];

		sql.push(`BEGIN;`);
		sql.push(`CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._getTableName()}" (`);
		sql.push(`"key" UUID PRIMARY KEY DEFAULT gen_random_uuid()`);
		sql.push(`);`);

		sql.push(`ALTER TABLE "${this._pgSchema}"."${this._getTableName()}" ADD COLUMN IF NOT EXISTS "${this._getBaseMetadataTypeColumnName()}" ${this._baseStore.getKeyColumnType()};`);

		_.each(this._relatedToStores, (metadataStore) => {
			sql.push(`ALTER TABLE "${this._pgSchema}"."${this._getTableName()}" ADD COLUMN IF NOT EXISTS "${metadataStore.getTableName()}Key" ${metadataStore.getKeyColumnType()};`);
		});

		sql.push(`COMMIT;`);

		return sql.join(`\n`);
	}
}

module.exports = PgMetadataRelations;