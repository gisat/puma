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
			let amountInGroup = queries.length / 6;
			let multipleResults = [];
			return Promise.all([
				this.handleSetOfQueries(queries.slice(0, amountInGroup)),
				this.handleSetOfQueries(queries.slice(amountInGroup, amountInGroup * 2)),
				this.handleSetOfQueries(queries.slice(amountInGroup * 2, amountInGroup * 3)),
				this.handleSetOfQueries(queries.slice(amountInGroup * 3, amountInGroup * 4)),
				this.handleSetOfQueries(queries.slice(amountInGroup * 4, amountInGroup * 5)),
				this.handleSetOfQueries(queries.slice(amountInGroup * 5, queries.length))
			]).then(results => {
				results.forEach(resultSet => {
					Array.prototype.push.apply(multipleResults, resultSet);
				});
				return multipleResults;
			});
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