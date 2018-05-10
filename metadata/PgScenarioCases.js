const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgScopeScenarioCaseRelations = require('./PgScopeScenarioCaseRelations');

class PgScenarioCases extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarios');

		this._pgScopeScenarioCaseRelations = new PgScopeScenarioCaseRelations(pgPool, pgSchema);
	}

	create(object) {
		if (!object) throw new Error('empty input');

		let scopeId;
		if(object.hasOwnProperty('scope_id')) {
			scopeId = object['scope_id'];
			delete object['scope_id'];
		}

		let keys = Object.keys(object);
		let columns = _.map(keys, (key) => {
			return `"${key}"`;
		});
		let values = _.map(keys, (key) => {
			if(key === "geometry") {
				return `ST_GeomFromGeoJSON('${JSON.stringify(object[key])}')`;
			} else if (_.isNumber(object[key])) {
				return object[key];
			} else {
				return `'${object[key]}'`;
			}
		});

		return this._pool.query(`INSERT INTO "${this._schema}"."${PgScenarioCases.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING id, name, description, ST_AsGeoJSON(geometry) AS geometry;`)
			.then((queryResult) => {
				if (queryResult.rowCount) {
					return queryResult.rows[0];
				} else {
					throw new Error('insert failed');
				}
			}).then((createdObject) => {
				if(scopeId) {
					return this._pgScopeScenarioCaseRelations.create({
						scope_id: scopeId,
						scenario_case_id: createdObject.id
					}).then(() => {
						createdObject['scope_id'] = scopeId;
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
		query.push(`SELECT cases.id, cases.name, cases.description, ST_AsGeoJSON(cases.geometry) AS geometry, relations.scope_id`);
		query.push(`FROM "${this._schema}"."${PgScenarioCases.tableName()}" AS cases`);
		query.push(`LEFT JOIN "${this._schema}"."${PgScenarioCases.relationTableName()}" AS relations`);
		query.push(`ON relations.scenario_case_id = cases.id`);

		if(keys.length) {
			let where = [];
			keys.forEach((key) => {
				where.push(`${key === "id" ? '"cases".' : ''}"${key}" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}`);
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
		return `scenario_case`;
	}

	static relationTableName() {
		return `scope_scenario_case_relation`
	}
}

module.exports = PgScenarioCases;