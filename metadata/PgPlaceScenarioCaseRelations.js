const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgPlaceScenarioCaseRelations extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarios');
	}

	create(objects) {
		if (!objects) throw new Error('empty input');

		objects = _.isArray(objects) ? objects : [objects];

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

			return this._pool.query(`INSERT INTO "${this._schema}"."${PgPlaceScenarioCaseRelations.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')});`)
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

		return this._pool.query(`SELECT * FROM "${this._schema}"."${PgPlaceScenarioCaseRelations.tableName()}";`)
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	update(updates) {
		updates = _.isArray(updates) ? updates : [updates];

		let promises = [];

		updates.forEach((update) => {
			let scenario_case_id = update.scenario_case_id;
			let place_id = update.place_id;

			if(scenario_case_id && (place_id || place_id === null)) {
				promises.push(
					this._pool.query(`DELETE FROM "${this._schema}"."${PgPlaceScenarioCaseRelations.tableName()}" WHERE "scenario_case_id" = ${scenario_case_id};`)
						.then(() => {
							if(place_id) {
								return this.create(update);
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
		return `place_scenario_case_relation`;
	}
}

module.exports = PgPlaceScenarioCaseRelations;