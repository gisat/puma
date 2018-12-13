const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgScopeScenarioCaseRelations extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarios');
	}

	create(objects) {
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
				this._pgPool.query(`INSERT INTO "${this._pgSchema}"."${PgScopeScenarioCaseRelations.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')});`)
			);
		});

		return Promise.all(promises);
	}

	getFiltered(filter) {
		let keys = filter ? Object.keys(filter) : [];
		let columns = _.map(keys, (key) => {
			return `"${key}"`;
		});
		let values = _.map(keys, (key) => {
			return _.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`;
		});

		return this._pgPool.query(`SELECT * FROM "${this._pgSchema}"."${PgScopeScenarioCaseRelations.tableName()}";`)
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	update(updates) {
		updates = _.isArray(updates) ? updates : [updates];

		let promises = [];

		updates.forEach((update) => {
			let scenario_case_id = update.scenario_case_id;
			let scope_ids = update.scope_ids;

			if (scenario_case_id && (scope_ids || scope_ids === null)) {
				promises.push(
					this._pgPool.query(`DELETE FROM "${this._pgSchema}"."${PgScopeScenarioCaseRelations.tableName()}" WHERE "scenario_case_id" = ${scenario_case_id};`)
						.then(() => {
							if (scope_ids) {
								return this.create(_.map(scope_ids, (scope_id) => {
									return {
										data: {
											scope_id: scope_id,
											scenario_case_id: scenario_case_id
										}
									}
								}));
							}
						})
				)
			}
		});

		return Promise.all(promises);
	}

	static tableName() {
		return `scope_scenario_case_relation`;
	}
}

module.exports = PgScopeScenarioCaseRelations;