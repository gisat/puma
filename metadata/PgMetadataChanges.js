const _ = require('lodash');

class PgMetadataChanges {
	constructor(pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
	}

	createChange(action, resourceType, resourceKey, changedBy, change) {
		return this._pgPool
			.query(
				`INSERT INTO "${this._pgSchema}"."metadataChanges" ("action", "resourceType", "resourceKey", "changedBy", "change") VALUES ($1, $2, $3, $4, $5)`,
				[action, resourceType, resourceKey, changedBy, change]
			)
			.then((result) => {
				return result.rows;
			})
			.then((rows) => {
				return this.getDataCollection(rows);
			})
	}

	getChangesForAvailableResources(resources, isAdmin) {
		let changes = {};
		let promises = [];

		_.each(resources, (resourceKeys, resourceType) => {
			let availableResources = ``;

			if(!isAdmin) {
				availableResources = ` AND "resourceKey" in ('${resourceKeys.join("', '")}')`
			}

			let query = `SELECT changed FROM "${this._pgSchema}"."metadataChanges" WHERE "resourceType" = '${resourceType}'${availableResources} ORDER BY changed DESC LIMIT 1`;
			promises.push(
				this._pgPool
					.query(query)
					.then((result) => {
						return result.rows;
					})
					.then((rows) => {
						changes[resourceType] = this.getDataCollection(rows);
					})
			)
		});

		return Promise
			.all(promises)
			.then(() => {
				return changes;
			});
	};

	getDataCollection(postgresRows) {
		return _.map(postgresRows, row => {
			return {
				key: row.id,
				data: {
					...row,
					id: undefined
				}
			}
		})
	}
}

module.exports = PgMetadataChanges;