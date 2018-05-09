const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgScenarioScenarioCaseRelations = require('./PgScenarioScenarioCaseRelations');

class PgScenarios extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarios');

		this._pgScenarioScenarioCaseRelations = new PgScenarioScenarioCaseRelations(pgPool, pgSchema);
	}

	create(object) {
		if (!object) throw new Error('empty input');

		let scenarioCaseId;
		if(object.hasOwnProperty('scenario_case_id')) {
			scenarioCaseId = object['scenario_case_id'];
			delete object['scenario_case_id'];
		}

		let keys = Object.keys(object);
		let columns = _.map(keys, (key) => {
			return `"${key}"`;
		});
		let values = _.map(keys, (key) => {
			return _.isNumber(object[key]) ? object[key] : `'${object[key]}'`;
		});

		return this._pool.query(`INSERT INTO "${this._schema}"."${PgScenarios.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING *;`)
			.then((queryResult) => {
				if (queryResult.rowCount) {
					return queryResult.rows[0];
				} else {
					throw new Error('insert failed');
				}
			})
			.then((createdObject) => {
				if(scenarioCaseId) {
					return this._pgScenarioScenarioCaseRelations.createWithouId({
						scenario_case_id: scenarioCaseId,
						scenario_id: createdObject.id
					}).then(() => {
						createdObject['scenario_case_id'] = scenarioCaseId;
						return createdObject;
					});
				} else {
					return createdObject;
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

		return this._pool.query(`SELECT * FROM "${this._schema}"."${PgScenarios.tableName()}";`)
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	static tableName() {
		return `scenario`;
	}
}

module.exports = PgScenarios;