const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgScopeScenarioCaseRelations = require('./PgScopeScenarioCaseRelations');
const PgPlaceScenarioCaseRelations = require('./PgPlaceScenarioCaseRelations');
const PgScenarios = require('./PgScenarios');

class PgScenarioCases extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarios');

		this._pgScopeScenarioCaseRelations = new PgScopeScenarioCaseRelations(pgPool, pgSchema);
		this._pgPlaceScenarioCaseRelations = new PgPlaceScenarioCaseRelations(pgPool, pgSchema);
		this._pgScenarios = new PgScenarios(pgPool, pgSchema);
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

	get(filter) {
 		let limit = 100;
		if (filter.hasOwnProperty('limit')) {
			limit = filter['limit'] ? filter['limit'] : limit;
			delete filter['limit'];
		}

		let offset = 0;
		if (filter.hasOwnProperty('offset')) {
			offset = filter['offset'] ? filter['offset'] : offset;
			delete filter['offset'];
		}

		let like;
		if (filter.hasOwnProperty('like')) {
			like = filter['like'];
			delete filter['like'];
		}

		let keys = filter ? Object.keys(filter) : [];

		let pagingQuery = [];
		pagingQuery.push(`SELECT COUNT(*) AS total`);
		pagingQuery.push(`FROM "${this._schema}"."${PgScenarioCases.tableName()}" AS cases`);
		pagingQuery.push(`LEFT JOIN "${this._schema}"."${PgScopeScenarioCaseRelations.tableName()}" AS scope_relations`);
		pagingQuery.push(`ON "scope_relations"."scenario_case_id" = "cases"."id"`);
		pagingQuery.push(`LEFT JOIN "${this._schema}"."${PgPlaceScenarioCaseRelations.tableName()}" AS place_relations`);
		pagingQuery.push(`ON "place_relations"."scenario_case_id" = "cases"."id"`);

		let query = [];
		query.push(`SELECT cases.id, cases.name, cases.description, ST_AsGeoJSON(cases.geometry) AS geometry, scope_relations.scope_id, place_relations.place_id`);
		query.push(`FROM "${this._schema}"."${PgScenarioCases.tableName()}" AS cases`);
		query.push(`LEFT JOIN "${this._schema}"."${PgScopeScenarioCaseRelations.tableName()}" AS scope_relations`);
		query.push(`ON "scope_relations"."scenario_case_id" = "cases"."id"`);
		query.push(`LEFT JOIN "${this._schema}"."${PgPlaceScenarioCaseRelations.tableName()}" AS place_relations`);
		query.push(`ON "place_relations"."scenario_case_id" = "cases"."id"`);

		if(keys.length || like) {
			let where = [];
			keys.forEach((key) => {
				where.push(`${key === "id" ? '"cases".' : ''}"${key}" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}`);
			});

			if(like) {
				Object.keys(like).forEach((key) => {
					where.push(`"${key}" ILIKE '%${like[key]}%'`);
				});
			}

			query.push(`WHERE ${where.join(' AND ')}`);
			pagingQuery.push(`WHERE ${where.join(' AND ')}`);
		}

		query.push(` ORDER BY "cases"."id" LIMIT ${limit} OFFSET ${offset};`);
		pagingQuery.push(`;`);

		let payload = {
			data: null,
			limit: limit,
			offset: offset,
			total: null
		};
		return this._pool.query(pagingQuery.join(' '))
			.then((pagingResult) => {
				payload.total = Number(pagingResult.rows[0].total);
				return this._pool.query(query.join(' '))
			})
			.then((queryResult) => {
				return queryResult.rows;
			})
			.then((scenarioCases) => {
				let promises = [];
				scenarioCases.forEach((scenarioCase) => {
					promises.push(
						this._pgScenarios.get({scenario_case_id: scenarioCase.id})
							.then((scenarios) => {
								scenarioCase.scenario_ids = _.map(scenarios, "id");
							})
					)
				});
				return Promise.all(promises)
					.then(() => {
						payload.data = scenarioCases;
						return payload;
					});
			});
	}

	update(id, data) {
		return new Promise((resolve, reject) => {
			id = Number(id || data.id);
			delete data[id];

			if(!_.isNaN(id)) {
				let keys = Object.keys(data);
				if(keys.length) {
					let sets = [];
					keys.forEach((key) => {
						sets.push(`"${key}" = ${_.isNumber(data[key]) ? data[key] : `'${data[key]}'`}`);
					});

					return this._pool.query(`UPDATE "${this._schema}"."${PgScenarioCases.tableName()}" SET ${sets.join(', ')} WHERE id = ${id}`)
						.then((result) => {
							if(result.rowCount) {
								resolve(this.get({id: id}));
							} else {
								reject(new Error(`Unable to update record with ID ${id}`));
							}
						});
				} else {
					reject(new Error(`There is no data to use for update`));
				}
			} else {
				reject(new Error(`Given ID has not numeric value`));
			}
		});
	}

	delete(id) {
		return new Promise((resolve, reject) => {
			id = Number(id);
			if(!_.isNaN(id)) {
				this._pool.query(`DELETE FROM "${this._schema}"."${PgScenarioCases.tableName()}" WHERE id = ${Number(id)};`)
					.then((result) => {
						if(result.rowCount) {
							resolve();
						} else {
							reject(new Error(`Unable to delete record with ID ${id}`));
						}
					});
			} else {
				reject(new Error(`Given ID has not numeric value!`));
			}
		});
	}

	static tableName() {
		return `scenario_case`;
	}
}

module.exports = PgScenarioCases;