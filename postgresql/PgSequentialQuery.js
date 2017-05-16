let Promise = require('promise');

/**
 * This class is used when there are multiple queries being called and there is at least possibly too many of them so
 * you want to prevent overloading databases.
 */
class PgSequentialQuery {
	constructor(pgPool) {
		this._pgPool = pgPool;
	}

	// What If I ran this in groups of four, which is usually the amount of cores.
	query(queries) {
		if(queries.length > 20) {
			// Generate UNION from the queries.
			let unionQuery = ``;
			queries.forEach((query, index) => {
				unionQuery += ` ${query} `;

				if(index !== queries.length - 1) {
					unionQuery += ` UNION `;
				}
			});

			return this._pgPool.query(unionQuery);
		} else {
			return this.handleSetOfQueries(queries);
		}
	}

	handleSetOfQueries(queries) {
		let results = [];
		let promise = Promise.resolve(null);
		queries.forEach(query => {
			promise = promise.then(() => {
				return this._pgPool.query(query);
			}).then(stats => {
				results.push(stats);
			})
		});

		return promise.then(() => {
			return results;
		});
	}
}

module.exports = PgSequentialQuery;