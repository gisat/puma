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
		let transactionSql = [];

		let insertSql = [];
		let deleteSql = [];

		let relatedStoresOptions = this.getRelatedStoresOptions();

		transactionSql.push(`BEGIN;`);
		_.each(relations, (value, property) => {
			let relatedStoreOptions = relatedStoresOptions[property];

			deleteSql.push(`DELETE FROM "${this._pgSchema}"."${this._getTableName()}" AS "${this._getTableName()}" WHERE`);
			deleteSql.push(`"${this._getTableName()}"."${this._getBaseMetadataTypeColumnName()}" = '${baseKey}'`);
			deleteSql.push(`AND "${this._getTableName()}"."${relatedStoreOptions.relatedStoreSqlColumName}" IS NOT NULL;`);

			if (relatedStoreOptions && relatedStoreOptions.allowMultipleRelations && _.isArray(value)) {
				_.each(value, (relationKey) => {
					insertSql.push(`INSERT INTO "${this._pgSchema}"."${this._getTableName()}"`);
					insertSql.push(`("${this._getBaseMetadataTypeColumnName()}", "${relatedStoreOptions.relatedStoreSqlColumName}")`);
					if(relationKey === null) {
						insertSql.push(`VALUES ('${baseKey}', NULL);`);
					} else {
						insertSql.push(`VALUES ('${baseKey}', '${relationKey}');`);
					}
				})
			} else if (relatedStoreOptions) {
				insertSql.push(`INSERT INTO "${this._pgSchema}"."${this._getTableName()}"`);
				insertSql.push(`("${this._getBaseMetadataTypeColumnName()}", "${relatedStoreOptions.relatedStoreSqlColumName}")`);
				if(value === null) {
					insertSql.push(`VALUES ('${baseKey}', NULL);`);
				} else {
					insertSql.push(`VALUES ('${baseKey}', '${value}');`);
				}
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

	getRelatedStoresOptions() {
		let relatedStoresOptions = {};

		_.each(this._relatedToStores, (relatedStore) => {
			let allowMultipleRelations = relatedStore.isAllowMultipleRelations();
			let relatedStoreSqlColumName = `${relatedStore.getTableName()}Key`;
			let relatedStoreColumName = `${relatedStore.getTableName()}${allowMultipleRelations ? 'Keys' : 'Key'}`;
			let relatedStoreColumnType = relatedStore.getKeyColumnType();

			relatedStoresOptions[relatedStoreColumName] = {
				relatedStoreSqlColumName,
				allowMultipleRelations,
				relatedStoreColumnType
			};
		});

		return relatedStoresOptions;
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
		let relatedStoresOptions = this.getRelatedStoresOptions();

		let querySql = [];
		let subquerySql = [];

		subquerySql.push(`SELECT "${this._getTableName()}"."${this._getBaseMetadataTypeColumnName()}" AS "${this._getBaseMetadataTypeColumnName()}"`);

		_.each(this.getRelatedStoresOptions(), (relatedStoreOptions) => {
			let aggregation = `STRING_AGG("${this._getTableName()}"."${relatedStoreOptions.relatedStoreSqlColumName}"::TEXT, '')`;
			if (relatedStoreOptions.allowMultipleRelations) {
				aggregation = `ARRAY_AGG("${this._getTableName()}"."${relatedStoreOptions.relatedStoreSqlColumName}"::TEXT)`;
			}
			subquerySql.push(`${aggregation} FILTER (WHERE "${this._getTableName()}"."${relatedStoreOptions.relatedStoreSqlColumName}" IS NOT NULL) AS "${relatedStoreOptions.relatedStoreSqlColumName}"`);
		});

		querySql.push(`SELECT * FROM (`);

		querySql.push(subquerySql.join(', '));

		querySql.push(`FROM "${this._pgSchema}"."${this._getTableName()}" GROUP BY "${this._getTableName()}"."${this._getBaseMetadataTypeColumnName()}"`)

		querySql.push(`) AS subquery`);

		let whereSql = [];

		let sqlVariableId = 1;
		let sqlVariableValues = [];
		_.each(relations, (relationValue, relationProperty) => {
			let relatedStoreOptions = relatedStoresOptions[relationProperty];
			if (relatedStoreOptions) {
				if (!_.isArray(relationValue) && !_.isObject(relationValue)) {
					if (relationValue !== null) {
						whereSql.push(`"subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" = $${sqlVariableId++}`);
						sqlVariableValues.push(relationValue);
					} else {
						whereSql.push(`"subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" IS NULL`);
					}
				} else if (_.isArray(relationValue) && relatedStoreOptions.allowMultipleRelations) {
					let variableId = sqlVariableId++;

					whereSql.push(`"subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" <@ $${variableId}`);
					whereSql.push(`"subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" @> $${variableId}`);

					sqlVariableValues.push(relationValue);
				} else if (_.isObject(relationValue)) {
					_.each(relationValue, (value, property) => {
						switch (property) {
							case `includes`:
								if (relatedStoreOptions.allowMultipleRelations) {
									whereSql.push(`"subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" @> $${sqlVariableId++}`);
									if (!_.isArray(value)) {
										value = [value];
									}
									sqlVariableValues.push(value);
								} else {
									throw new Error('Unable to use this filter type for this column');
								}
								break;
							case `match`:
								if (relatedStoreOptions.allowMultipleRelations) {
									let variableId = sqlVariableId++;
									whereSql.push(`"subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" <@ $${variableId}`);
									whereSql.push(`"subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" @> $${variableId}`);
									sqlVariableValues.push(value);
								} else {
									throw new Error('Unable to use this filter type for this column');
								}
								break;
							case `excludes`:
								if (relatedStoreOptions.allowMultipleRelations) {
									whereSql.push(`NOT ("subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" @> $${sqlVariableId++})`);
									if (!_.isArray(value)) {
										value = [value];
									}
									sqlVariableValues.push(value);
								} else {
									throw new Error('Unable to use this filter type for this column');
								}
								break;
							case `like`:
								whereSql.push(`"subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" LIKE '%${value}%'`);
								break;
							case `in`:
								if (relatedStoreOptions.allowMultipleRelations) {
									whereSql.push(`"subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" <@ $${sqlVariableId++}`);
									sqlVariableValues.push(value);
								} else {
									let nullCheck = '';
									if (value.includes(null)) {
										nullCheck = ` OR "subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" IS NULL`;
									}
									value = _.compact(value);
									whereSql.push(`("subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" IN ('${value.join("', '")}')${nullCheck})`);
								}
								break;
							case `notin`:
								if (relatedStoreOptions.allowMultipleRelations) {
									whereSql.push(`NOT ("subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" <@ $${sqlVariableId++})`);
									sqlVariableValues.push(value);
								} else {
									let nullCheck = '';
									if (!value.includes(null)) {
										nullCheck = `OR "subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" IS NULL`;
									}
									value = _.compact(value);
									whereSql.push(`("subquery"."${relatedStoreOptions.relatedStoreSqlColumName}" NOT IN ('${value.join("', '")}')${nullCheck})`);
								}
								break;
						}
					});
				}
			}
		});

		if (whereSql.length) {
			querySql.push(`WHERE ` + whereSql.join(` AND `));
		}

		return this._pgPool
			.query(querySql.join(' '), sqlVariableValues)
			.then((pgResult) => {
				return _.map(pgResult.rows, (row) => {
					// todo this is just a quick fix, i have to find what couse this (there is an array of duplicate strings instead of just a singe string)
					return _.isArray(row[this._getBaseMetadataTypeColumnName()]) ? row[this._getBaseMetadataTypeColumnName()][0] : row[this._getBaseMetadataTypeColumnName()];
				});
			});
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