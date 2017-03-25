let FilteredPgCollection = require('../postgresql/FilteredPgCollection');

class FilteredPgStyles {
	/**
	 *
	 * @param pgPool
	 * @param schema
	 * @param filter
	 */
	constructor(pgPool, schema, filter) {
		this.collection = new FilteredPgCollection(pgPool, schema, 'style', filter);
	}

	all() {
		return this.collection.all();
	}
}

module.exports = FilteredPgStyles;