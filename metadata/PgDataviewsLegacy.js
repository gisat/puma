const PgCollection = require('../common/PgCollection');

class PgDataviewsLegacy extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgDataviewsLegacy`);

		this._legacy = true;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
		    `dataview`
		]
	}

	getMongoFilter(options, filter) {
		let mongoFilter = {};

		if (options.keys.length || options.like || options.any || options.notIn) {
			let where = [];
			options.keys.forEach((key) => {
				if (key === 'key') {
					mongoFilter._id = isNaN(filter[key]) ? String(filter[key]) : Number(filter[key]);
				} else if(filter[key] === null) {
					mongoFilter[key] = {
						'$exists': false
					};
				} else {
					if(key === 'name') {
						mongoFilter[key] = filter[key];
					} else {
						mongoFilter[`conf.${key}`] = filter[key];
					}
				}
			});

			if (options.like) {
				Object.keys(options.like).forEach((key) => {
					mongoFilter[key === 'key' ? '_id' : key] = {
						'$regex': options.like[key],
						'$options': 'i'
					}
				});
			}

			if (options.any) {
				Object.keys(options.any).forEach((key) => {
					mongoFilter[key === 'key' ? '_id' : key] = {
						'$in': options.any[key]
					}
				});
			}

			if (options.notIn) {
				Object.keys(options.notIn).forEach((key) => {
					mongoFilter[key === 'key' ? '_id' : key] = {
						'$nin': options.notIn[key]
					}
				});
			}
		}

		return mongoFilter;
	}

	static collectionName() {
		return 'dataview';
	}

	static groupName() {
		return 'dataviews';
	}

	static tableName() {
		return 'dataview';
	}
}

module.exports = PgDataviewsLegacy;