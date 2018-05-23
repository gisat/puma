const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgScenarioScenarioCaseRelations extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarios');
	}

	create(object) {
		if (!object) throw new Error('empty input');

		let keys = Object.keys(object);
		let columns = _.map(keys, (key) => {
			return `"${key}"`;
		});
		let values = _.map(keys, (key) => {
			return _.isNumber(object[key]) ? object[key] : `'${object[key]}'`;
		});

		return this._pool.query(`INSERT INTO "${this._schema}"."${PgScenarioScenarioCaseRelations.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING *;`)
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

		return this._pool.query(`SELECT * FROM "${this._schema}"."${PgScenarioScenarioCaseRelations.tableName()}";`)
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	static tableName() {
		return `scenario_scenario_case_relation`;
	}
}

module.exports = PgScenarioScenarioCaseRelations;