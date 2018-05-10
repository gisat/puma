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
					return this._pgScenarioScenarioCaseRelations.create({
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

		let query = [];
		query.push(`SELECT scenarios.*, relations.scenario_case_id`);
		query.push(`FROM "${this._schema}"."${PgScenarios.tableName()}" AS scenarios`);
		query.push(`LEFT JOIN "${this._schema}"."${PgScenarios.relationTableName()}" AS relations`);
		query.push(`ON relations.scenario_id = scenarios.id`);

		if(keys.length) {
			let where = [];
			keys.forEach((key) => {
				where.push(`${key === "id" ? '"scenarios".' : ''}"${key}" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}`);
			});

			query.push(`WHERE ${where.join(' AND ')}`);
		}

		query.push(`;`);

		return this._pool.query(query.join(' '))
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	static tableName() {
		return `scenario`;
	}

	static relationTableName() {
		return `scenario_scenario_case_relation`;
	}
}

module.exports = PgScenarios;