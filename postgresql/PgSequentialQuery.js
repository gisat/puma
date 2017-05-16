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
			// Split into for groups.
			let amountInGroup = queries.length() / 4;
			let multipleResults = [];
			return this.handleSetOfQueries(queries.slice(0, amountInGroup)).then(results => {
				Array.prototype.push.apply(multipleResults, results);
				return this.handleSetOfQueries(queries.slice(amountInGroup, amountInGroup * 2));
			}).then(results => {
				Array.prototype.push.apply(multipleResults, results);
				return this.handleSetOfQueries(queries.slice(amountInGroup * 2, amountInGroup * 3));
			}).then(results => {
				Array.prototype.push.apply(multipleResults, results);
				return this.handleSetOfQueries(queries.slice(amountInGroup * 3, queries.length));
			})
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