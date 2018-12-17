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
		sql.push(`VALUES ('${baseKey}', '${Object.values(relations).join(`', '`)}')`);
		sql.push(`ON CONFLICT (${this._getBaseMetadataTypeColumnName()}) DO UPDATE SET`);

		let updates = [];
		_.each(relations, (value, property) => {
			updates.push(`${property} = ${value === null ? `NULL` : `'${value}'`}`);
		});

		sql.push(updates.join(`, `));
		sql.push(`;`);

		return this._pgPool
			.query(sql.join(` `))
			.catch((error) => {
				console.log(error);
			})
	}

	updateRelations(baseKey, relations) {
		return this.addRelations(baseKey, relations);
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

	getBaseKeysByRelations(relations) {
		return this._pgPool
			.query(`SELECT ${this._getBaseMetadataTypeColumnName()} FROM "${this._pgSchema}"."${this._getTableName()}" WHERE ${_.map(relations, (value, property) => { return `${property} = '${value}'`}).join(` AND `)};`)
			.then((result) => {
				return _.map(result.rows, (row) => {
					return row[this._getBaseMetadataTypeColumnName()];
				});
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
		sql.push(`ALTER TABLE "${this._pgSchema}"."${this._getTableName()}" ADD COLUMN IF NOT EXISTS ${this._baseMetadataType}_key TEXT UNIQUE;`);

		_.each(this._relatedToMetadataTypes, (metadataType) => {
			sql.push(`ALTER TABLE "${this._pgSchema}"."${this._getTableName()}" ADD COLUMN IF NOT EXISTS ${metadataType}_key TEXT;`);
		});

		sql.push(`COMMIT;`);

		return sql.join(`\n`);
	}
}

module.exports = PgMetadataRelations;