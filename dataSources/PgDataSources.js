const PgCrud = require(`../common/PgCrud`);

const PgRasters = require(`./PgRasters`);
const PgVectors = require(`./PgVectors`);
const PgWmses = require(`./PgWmses`);
const PgWmtses = require(`./PgWmtses`);

class PgDataSources extends PgCrud {
	constructor(pgPool, pgSchema) {
		super();

		this._pgRasters = new PgRasters(pgPool, pgSchema);
		this._pgVectors = new PgVectors(pgPool, pgSchema);
		this._pgWmses = new PgWmses(pgPool, pgSchema);
		this._pgWmtses = new PgWmtses(pgPool, pgSchema);

		this._pgTypes = {
			[PgRasters.groupName()]: {
				store: this._pgRasters,
				type: PgRasters.tableName()
			},
			[PgVectors.groupName()]: {
				store: this._pgVectors,
				type: PgVectors.tableName()
			},
			[PgWmses.groupName()]: {
				store: this._pgWmses,
				type: PgWmses.tableName()
			},
			[PgWmtses.groupName()]: {
				store: this._pgWmtses,
				type: PgWmtses.tableName()
			}
		};
	}

	async get(types, request, user) {
		if(types === `dataSources`) {
			return this.getCombined(request, user);
		} else {
			return super.get(types, request, user);
		}
	}

	async getCombined(request, user) {
		let promises = [];
		let requestedType;

		if(request.filter && request.filter.type) {
			requestedType = request.filter.type;
			delete request.filter.type;
		}

		_.each(this._pgTypes, (pgType, group) => {
			if(!requestedType || pgType.type === requestedType) {
				promises.push(
					super.get(group, request, user)
						.then((results) => {
							return {
								data: {
									dataSources: _.map(results.data[group], (data) => {
										data.data.type = pgType.type;
										return data;
									}),
									changes: {
										dataSources: results.changes[group]
									},
									limit: results.limit,
									offset: results.offset,
									total: results.total
								}
							}
						})
				);
			}
		});

		return Promise.all(promises)
			.then((results) => {
				let data = {
					dataSources: [],
					changes: {
						dataSources: null,
					},
					limit: 0,
					offset: 0,
					total: 0
				};

				_.each(results, (result) => {
					data.dataSources = _.concat(data.dataSources, result.data.dataSources);
					data.changes.dataSources = result.data.changes.dataSources;
					data.limit = result.data.limit;
					data.offset = result.data.offset;
					data.total += result.data.total;
				});

				return {
					data
				};
			})
	}
}

module.exports = PgDataSources;