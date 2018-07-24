const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgLpisCaseViewRelations extends PgCollection {
	constructor(pgPool, pgSchema, mongo) {
		super(pgPool, pgSchema, mongo, 'PgLpisCaseViewRelations');
	}

	create(objects, user, extra) {
		if (!objects) throw new Error('empty input');

		objects = _.isArray(objects) ? objects : [objects];

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
				this._pool.query(`INSERT INTO "${this._schema}"."${PgLpisCaseViewRelations.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')});`)
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
		pagingQuery.push(`FROM "${this._schema}"."${PgLpisCaseViewRelations.tableName()}" AS a`);

		let query = [];
		query.push(`SELECT "a".*`);
		query.push(`FROM "${this._schema}"."${PgLpisCaseViewRelations.tableName()}" AS a`);

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
			let lpis_case_id = update.lpis_case_id;
			let view_id = update.view_id;

			if(lpis_case_id && (view_id || view_id === null)) {
				promises.push(
					this._pool.query(`DELETE FROM "${this._schema}"."${PgLpisCaseViewRelations.tableName()}" WHERE "lpis_case_id" = ${lpis_case_id};`)
						.then(() => {
							if(view_id) {
								return this.create({
									view_id: view_id,
									lpis_case_id: lpis_case_id
								});
							}
						})
				)
			}
		});

		return Promise.all(promises);
	}

	static tableName() {
		return `lpis_case_view_relation`;
	}
}

module.exports = PgLpisCaseViewRelations;