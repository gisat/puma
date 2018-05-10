const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgScopeScenarioCaseRelations = require('./PgScopeScenarioCaseRelations');
const PgPlaceScenarioCaseRelations = require('./PgPlaceScenarioCaseRelations');

class PgScenarioCases extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarios');

		this._pgScopeScenarioCaseRelations = new PgScopeScenarioCaseRelations(pgPool, pgSchema);
		this._pgPlaceScenarioCaseRelations = new PgPlaceScenarioCaseRelations(pgPool, pgSchema);
	}

	create(object) {
		if (!object) throw new Error('empty input');

		let scopeId;
		if(object.hasOwnProperty('scope_id')) {
			scopeId = object['scope_id'];
			delete object['scope_id'];
		}

		let placeId;
		if(object.hasOwnProperty('place_id')) {
			placeId = object['place_id'];
			delete object['place_id'];
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

		return this._pool.query(`INSERT INTO "${this._schema}"."${PgScenarioCases.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING id;`)
			.then((queryResult) => {
				if (queryResult.rowCount) {
					return queryResult.rows[0].id;
				} else {
					throw new Error('insert failed');
				}
			}).then((createdObjectId) => {
				return Promise.resolve()
					.then(() => {
						if(scopeId) {
							return this._pgScopeScenarioCaseRelations.create({
								scope_id: scopeId,
								scenario_case_id: createdObjectId
							});
						}
					}).then(() => {
						return createdObjectId;
					});
			}).then((createdObjectId) => {
				return Promise.resolve()
					.then(() => {
						if(placeId) {
							return this._pgPlaceScenarioCaseRelations.create({
								place_id: placeId,
								scenario_case_id: createdObjectId
							});
						}
					}).then(() => {
						return createdObjectId;
					});
			}).then((createdObjectId) => {
				return this.getFiltered({id: createdObjectId});
			});
	}

	getFiltered(filter) {
		let keys = filter ? Object.keys(filter) : [];

		let query = [];
		query.push(`SELECT cases.id, cases.name, cases.description, ST_AsGeoJSON(cases.geometry) AS geometry, scope_relations.scope_id, place_relations.place_id`);
		query.push(`FROM "${this._schema}"."${PgScenarioCases.tableName()}" AS cases`);
		query.push(`LEFT JOIN "${this._schema}"."${PgScopeScenarioCaseRelations.tableName()}" AS scope_relations`);
		query.push(`ON scope_relations.scenario_case_id = cases.id`);
		query.push(`LEFT JOIN "${this._schema}"."${PgPlaceScenarioCaseRelations.tableName()}" AS place_relations`);
		query.push(`ON place_relations.scenario_case_id = cases.id`);

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
}

module.exports = PgScenarioCases;