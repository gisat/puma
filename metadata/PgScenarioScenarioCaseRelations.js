const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgScenarioScenarioCaseRelations extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarioScenarioCaseRelations');
	}

	create(objects) {
		if (!objects) throw new Error(`There is nothing to create`);

		objects = _.isArray(objects) ? objects : [objects];

		if (!objects.length) throw new Error(`There is nothing to create`);

		let promises = [];
		objects.forEach((object) => {
			let uuid = object.uuid;
			let data = object.data;

			let keys = Object.keys(data);
			let columns = _.map(keys, (key) => {
				return `"${key}"`;
			});
			let values = _.map(keys, (key) => {
				return _.isNumber(data[key]) ? data[key] : `'${data[key]}'`;
			});

			promises.push(
				this._pool.query(`INSERT INTO "${this._schema}"."${PgScenarioScenarioCaseRelations.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING id;`)
					.then((queryResult) => {
						if (queryResult.rowCount) {
							return queryResult.rows[0].id;
						}
					})
					.then((id) => {
						return this.get({id: id, unlimited: true})
							.then((payload) => {
								let id = payload.data[0].id;
								delete payload.data[0].id;

								return {
									uuid: uuid,
									id: id,
									data: payload.data[0].data
								}
							});
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
		pagingQuery.push(`FROM "${this._schema}"."${PgScenarioScenarioCaseRelations.tableName()}" AS a`);

		let query = [];
		query.push(`SELECT "a".*`);
		query.push(`FROM "${this._schema}"."${PgScenarioScenarioCaseRelations.tableName()}" AS a`);

		if (keys.length || like || any) {
			let where = [];
			keys.forEach((key) => {
				where.push(`${key === "id" ? '"a".' : ''}"${key}" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}`);
			});

			if (like) {
				Object.keys(like).forEach((key) => {
					where.push(`"${key}" ILIKE '%${like[key]}%'`);
				});
			}

			if (any) {
				Object.keys(any).forEach((key) => {
					where.push(`${key === 'id' ? `"a"."id"` : `"${key}"`} IN (${any[key].join(', ')})`);
				});
			}

			query.push(`WHERE ${where.join(' AND ')}`);
			pagingQuery.push(`WHERE ${where.join(' AND ')}`);
		}

		query.push(`ORDER BY "a"."id"`);
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
			.then((rows) => {
				payload.data = _.map(rows, (row) => {
					let id = row.id;
					let data = row;
					delete data['id'];

					return {
						id: id,
						data: data
					}
				});
				return payload;
			});
	}

	update(updates) {
		updates = _.isArray(updates) ? updates : [updates];

		let promises = [];

		updates.forEach((update) => {
			let scenario_case_id = update.scenario_case_id;
			let scenario_ids = update.scenario_ids;

			if(scenario_case_id && (scenario_ids || scenario_ids === null)) {
				promises.push(
					this._pool.query(`DELETE FROM "${this._schema}"."${PgScenarioScenarioCaseRelations.tableName()}" WHERE "scenario_case_id" = ${scenario_case_id};`)
						.then(() => {
							if(scenario_ids && scenario_ids.length) {
								return this.create(_.map(scenario_ids, (scenario_id) => {
									return {
										data: {
											scenario_id: scenario_id,
											scenario_case_id: scenario_case_id
										}
									}
								}));
							}
						})
				)
			}
		});

		return Promise.all(promises)
			.then(() => {
				return true;
			})
	}

	static tableName() {
		return `scenario_scenario_case_relation`;
	}
}

module.exports = PgScenarioScenarioCaseRelations;