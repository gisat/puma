let Promise = require('promise');
let moment = require('moment');
let md5 = require('blueimp-md5');

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
		if (queries.length > 20) {
			let viewCreationSql = queries.join(' UNION ');
			let viewName = "a" + md5(queries.join());

			logger.info(`AttributeController#statistics Queries: ${queries.length} Start: ${moment().format()} View: ${viewName}`);
			// Create table with the name hashed from the string of queries.
			// If the materialized view doesn't exist, create it otherwise simply query the materialized view.
			viewCreationSql = 'CREATE MATERIALIZED VIEW IF NOT EXISTS ' + viewName + ' AS ' + viewCreationSql;
			return this._pgPool.query(viewCreationSql).then(() => {
				logger.info(`AttributeController#statistics Queries: ${queries.length} Start retrieval: ${moment().format()}`);
				return this._pgPool.query('SELECT * FROM ' + viewName).then(results=>{
					logger.info(`AttributeController#statistics Queries End: ${moment().format()}`);

					return [results];
				});
			});
		} else {
			return this.handleSetOfQueries(queries);
		}
	}

	handleSetOfQueries(queries) {
		let results = [];
		let promise = Promise.resolve(null);
		queries.forEach(query => {
			logger.info(`PgSequentialQuery#query SQL: ${query}`);
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