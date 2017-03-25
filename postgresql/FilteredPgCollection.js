let _ = require('underscore');

/**
 * This class can build and query the PostgreSQL tables based on the provided filter.
 * The filter comes in the setup:
 * {
 *   key: value
 * }
 * Where key represents column in the table and value must be either array, string or number.
 * If value is array then all the rows where given key column contain any of the values in the array will be returned.
 * If the value is Number or String it will just correctly have apostrophes added.
 *
 * There is no filtering on the returned columns. All are always returned. Also this collection doesn't support joining.
 *
 * TODO: Handle joining. Or better get some real framework, that will do this for us.
 */
class FilteredPgCollection {
	constructor(pgPool, schema, table, filter) {
		this.pgPool = pgPool;
		this.schema = schema;
		this.table = table;
		this.filter = filter;
	}

	all() {
		return this.pgPool.query(`SELECT * FROM ${this.table} ${this.getWhereClause()};`);
	}

	/**
	 * @private
	 * @returns {*}
	 */
	getWhereClause() {
		let whereKeys = Object.keys(this.filter);
		if (!whereKeys.length) {
			return '';
		}

		// TODO: Refactor.
		let limitations = whereKeys.map(key => {
			let value = this.filter[key];
			if (_.isNumber(value)) {
				return ` ${key} = ${value} `;
			} else if (_.isArray(value)) {
				let inSequence = value.map(value => {
					if (_.isNumber(value)) {
						return value;
					} else if (_.isString(value)) {
						return `'${value}'`;
					} else {
						return null;
					}
				});

				inSequence = inSequence.filter(limitation => limitation !== null);

				return ` ${key} IN [${inSequence.join(',')}] `;
			} else if (_.isString(value)) {
				return ` ${key} = '${value}'`;
			} else {
				return null;
			}
		});

		limitations = limitations.filter(limitation => limitation !== null);

		return ` WHERE ${limitations.join(' AND ')} `;
	}
}

module.exports = FilteredPgCollection;