let Promise = require('promise');
let moment = require('moment');

let logger = require('../common/Logger').applicationWideLogger;

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
			logger.info(`AttributeController#statistics Queries: ${queries.length} Start: ${moment().format()}`);

			// Split into for groups.
			let amountInGroup = queries.length / 4;
			let multipleResults = [];
			return Promise.all([
				this.handleSetOfQueries(queries.slice(0, amountInGroup)),
				this.handleSetOfQueries(queries.slice(amountInGroup, amountInGroup * 2)),
				this.handleSetOfQueries(queries.slice(amountInGroup * 2, amountInGroup * 3)),
				this.handleSetOfQueries(queries.slice(amountInGroup * 3, queries.length))
			]).then(results => {
				logger.info(`AttributeController#statistics Queries End: ${moment().format()}`);
				results.forEach(resultSet => {
					Array.prototype.push.apply(multipleResults, resultSet);
				});
				logger.info(`AttributeController#statistics Queries Processing End: ${moment().format()}`);
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