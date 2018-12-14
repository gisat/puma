const _ = require(`lodash`);

class PgMetadataRelations {
	constructor(pgPool, pgSchema, metadataType, relatedToMetadataTypes) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;

		this._baseMetadataType = metadataType;
		this._relatedToMetadataTypes = relatedToMetadataTypes;

		this._initPgTable();
	}

	addRelations(baseKey, relations) {
		let sql = [];

		sql.push(`INSERT INTO "${this._pgSchema}"."${this._getTableName()}"`);
		sql.push(`(${this._getBaseMetadataTypeColumnName()}, ${Object.keys(relations).join(`, `)})`);
		sql.push(`values ('${baseKey}', '${Object.values(relations).join(`', '`)}');`);

		return this._pgPool
			.query(sql.join(` `))
			.catch((error) => {
				console.log(error);
			})
	}

	updateRelations(baseKey, relations) {
		let sql = [];

		let set = [];

		_.each(relations, (value, property) => {
			if(value === null) {
				set.push(`${property} = NULL`);
			} else {
				set.push(`${property} = '${value}'`);
			}
		});

		sql.push(`UPDATE "${this._pgSchema}"."${this._getTableName()}" SET ${set.join(`, `)} WHERE ${this._getBaseMetadataTypeColumnName()} = '${baseKey}'`);

		return this._pgPool
			.query(sql.join(` `))
			.catch((error) => {
				console.log(error);
			})
	}

	deleteRelations(baseKey) {
		return this._pgPool
			.query(`DELETE FROM "${this._pgSchema}"."${this._getTableName()}" WHERE ${this._getBaseMetadataTypeColumnName()} = '${baseKey}'`);
	}

	getRelationsForBaseKeys(baseKeys) {
		return this._pgPool
			.query(`SELECT ${this._getBaseMetadataTypeColumnName()}, ${this.getMetadataTypeKeyColumnNames().join(`, `)} FROM "${this._pgSchema}"."${this._getTableName()}" WHERE ${this._getBaseMetadataTypeColumnName()} IN ('${baseKeys.join(`', '`)}')`)
			.then((result) => {
				let relations;

				_.each(result.rows, (row) => {
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

	getMetadataTypeKeyColumnNames() {
		return _.map(this._relatedToMetadataTypes, (metadataType) => {
			return `${metadataType}_key`;
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
		return `${this._baseMetadataType}_key`;
	}

	_getTableName() {
		return `${this._baseMetadataType}_relation`;
	}

	_getTableSql() {
		let sql = [];

		sql.push(`BEGIN;`);
		sql.push(`CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._getTableName()}" (id SERIAL PRIMARY KEY, uuid UUID DEFAULT gen_random_uuid());`);
		sql.push(`ALTER TABLE "${this._pgSchema}"."${this._getTableName()}" ADD COLUMN IF NOT EXISTS ${this._baseMetadataType}_key TEXT;`);

		_.each(this._relatedToMetadataTypes, (metadataType) => {
			sql.push(`ALTER TABLE "${this._pgSchema}"."${this._getTableName()}" ADD COLUMN IF NOT EXISTS ${metadataType}_key TEXT;`);
		});

		sql.push(`COMMIT;`);

		return sql.join(`\n`);
	}
}

module.exports = PgMetadataRelations;