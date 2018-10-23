const _ = require('lodash');

class PgMetadataChanges {
	constructor(pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
	}

	createChange(action, resourceType, resourceKey, changedBy, change) {
		return this._pgPool
			.query(
				`INSERT INTO "${this._pgSchema}"."metadata_changes" (action, resource_type, resource_key, changed_by, change) VALUES ($1, $2, $3, $4, $5)`,
				[action, resourceType, resourceKey, changedBy, change]
			)
			.then((result) => {
				return result.rows;
			})
			.then((rows) => {
				return this.getDataCollection(rows);
			})
	}

	getChangesForAvailableResources(resources) {
		let changes = {};
		let promises = [];

		_.each(resources, (resourceKeys, resourceType) => {
			promises.push(
				this._pgPool
					.query(
						`SELECT * FROM "${this._pgSchema}"."metadata_changes" WHERE resource_type = '${resourceType}' AND resource_key in ('${resourceKeys.join("', '")}') ORDER BY changed DESC LIMIT 1`
					)
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