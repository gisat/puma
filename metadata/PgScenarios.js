const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgScenarioScenarioCaseRelations = require('./PgScenarioScenarioCaseRelations');

class PgScenarios extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarios');

		this._pgScenarioScenarioCaseRelations = new PgScenarioScenarioCaseRelations(pgPool, pgSchema);
	}

	create(objects) {
		if (!objects || !objects.length) throw new Error(`There is nothing to create`);

		let promises = [];
		objects.forEach((object) => {
			let uuid = object.uuid;
			let data = object.data;

			let scenarioCaseId;
			if (data.hasOwnProperty('scenario_case_id')) {
				scenarioCaseId = data['scenario_case_id'];
				delete data['scenario_case_id'];
			}

			let keys = Object.keys(data);
			let columns = _.map(keys, (key) => {
				return `"${key}"`;
			});
			let values = _.map(keys, (key) => {
				return _.isNumber(data[key]) ? data[key] : `'${data[key]}'`;
			});

			promises.push(
				this._pool.query(`INSERT INTO "${this._schema}"."${PgScenarios.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING id;`)
					.then((queryResult) => {
						if (queryResult.rowCount) {
							return queryResult.rows[0].id;
						}
					})
					.then((id) => {
						if (id && scenarioCaseId) {
							return this._pgScenarioScenarioCaseRelations.create({
								scenario_case_id: scenarioCaseId,
								scenario_id: id
							}).then(() => {
								return this.get({id: id, unlimited: true})
									.then((payload) => {
										return {
											uuid: uuid,
											data: payload.data[0]
										}
									});
							});
						}
					})
			);
		});

		return Promise.all(promises);
	}

	get(filter) {
		let payload = {
			data: null,
		};

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

		let any;
		if (filter.hasOwnProperty('any')) {
			any = filter['any'];
			delete filter['any'];
		}

		let unlimited;
		if (filter.hasOwnProperty('unlimited')) {
			unlimited = filter.unlimited;
			delete filter['unlimited'];
		}

		let keys = filter ? Object.keys(filter) : [];

		let pagingQuery = [];
		pagingQuery.push(`SELECT COUNT(*) AS total`);
		pagingQuery.push(`FROM "${this._schema}"."${PgScenarios.tableName()}" AS scenarios`);
		pagingQuery.push(`LEFT JOIN "${this._schema}"."${PgScenarioScenarioCaseRelations.tableName()}" AS relations`);
		pagingQuery.push(`ON "relations"."scenario_id" = "scenarios"."id"`);

		let query = [];
		query.push(`SELECT scenarios.*, relations.scenario_case_id`);
		query.push(`FROM "${this._schema}"."${PgScenarios.tableName()}" AS scenarios`);
		query.push(`LEFT JOIN "${this._schema}"."${PgScenarioScenarioCaseRelations.tableName()}" AS relations`);
		query.push(`ON "relations"."scenario_id" = "scenarios"."id"`);

		if (keys.length || like || any) {
			let where = [];
			keys.forEach((key) => {
				where.push(`${key === "id" ? '"scenarios".' : ''}"${key}" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}`);
			});

			if (like) {
				Object.keys(like).forEach((key) => {
					where.push(`"${key}" ILIKE '%${like[key]}%'`);
				});
			}

			if (any) {
				Object.keys(any).forEach((key) => {
					where.push(`${key === 'id' ? `"scenarios"."id"` : `"${key}"`} IN (${any[key].join(', ')})`);
				});
			}

			query.push(`WHERE ${where.join(' AND ')}`);
			pagingQuery.push(`WHERE ${where.join(' AND ')}`);
		}

		query.push(`ORDER BY "scenarios"."id"`);
		if (!unlimited) {
			query.push(`LIMIT ${limit} OFFSET ${offset}`);

			payload.limit = limit;
			payload.offset = offset;
			payload.total = null;
		}

		query.push(`;`);
		pagingQuery.push(`;`);

		return this._pool.query(pagingQuery.join(' '))
			.then((pagingResult) => {
				if (payload.hasOwnProperty('total')) {
					payload.total = Number(pagingResult.rows[0].total);
				}
				return this._pool.query(query.join(' '))
			})
			.then((queryResult) => {
				return queryResult.rows;
			})
			.then((scenarios) => {
				payload.data = scenarios;
				return payload;
			});
	}

	update(data) {
		return new Promise((resolve, reject) => {
			id = Number(data.id);
			delete data[id];

			if (!_.isNaN(id)) {
				let keys = Object.keys(data);
				if (keys.length) {
					let sets = [];
					keys.forEach((key) => {
						sets.push(`"${key}" = ${_.isNumber(data[key]) ? data[key] : `'${data[key]}'`}`);
					});

					return this._pool.query(`UPDATE "${this._schema}"."${PgScenarios.tableName()}" SET ${sets.join(', ')} WHERE id = ${id}`)
						.then((result) => {
							if (result.rowCount) {
								resolve(this.get({id: id, unlimited: true}));
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
			if (!_.isNaN(id)) {
				this._pool.query(`DELETE FROM "${this._schema}"."${PgScenarios.tableName()}" WHERE id = ${Number(id)};`)
					.then((result) => {
						if (result.rowCount) {
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
		return `scenario`;
	}
}

module.exports = PgScenarios;