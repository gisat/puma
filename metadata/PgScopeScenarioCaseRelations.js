const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgScopeScenarioCaseRelations extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarios');
	}

	createWithouId(object) {
		if (!object) throw new Error('empty input');

		let keys = Object.keys(object);
		let columns = _.map(keys, (key) => {
			return `"${key}"`;
		});
		let values = _.map(keys, (key) => {
			return _.isNumber(object[key]) ? object[key] : `'${object[key]}'`;
		});

		return this._pool.query(`INSERT INTO "${this._schema}"."${PgScopeScenarioCaseRelations.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING *;`)
			.then((queryResult) => {
				if (queryResult.rowCount) {
					return queryResult.rows[0];
				} else {
					throw new Error('insert failed');
				}
			});
	}

	getFiltered(filter) {
		let keys = filter ? Object.keys(filter) : [];
		let columns = _.map(keys, (key) => {
			return `"${key}"`;
		});
		let values = _.map(keys, (key) => {
			return _.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`;
		});

		return this._pool.query(`SELECT * FROM "${this._schema}"."${PgScopeScenarioCaseRelations.tableName()}";`)
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	static tableName() {
		return `scope_scenario_case_relation`;
	}
}

module.exports = PgScopeScenarioCaseRelations;