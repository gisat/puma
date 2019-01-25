const PgCrud = require(`../common/PgCrud`);

const PgRaster = require(`./PgRaster`);
const PgVector = require(`./PgVector`);
const PgWms = require(`./PgWms`);
const PgWmts = require(`./PgWmts`);

class PgDataSources extends PgCrud {
	constructor(pgPool, pgSchema) {
		super();

		this._pgRaster = new PgRaster(pgPool, pgSchema);
		this._pgVector = new PgVector(pgPool, pgSchema);
		this._pgWms = new PgWms(pgPool, pgSchema);
		this._pgWmts = new PgWmts(pgPool, pgSchema);

		this._pgTypes = {
			[PgRaster.groupName()]: {
				store: this._pgRaster,
				type: PgRaster.tableName()
			},
			[PgVector.groupName()]: {
				store: this._pgVector,
				type: PgVector.tableName()
			},
			[PgWms.groupName()]: {
				store: this._pgWms,
				type: PgWms.tableName()
			},
			[PgWmts.groupName()]: {
				store: this._pgWmtse,
				type: PgWmts.tableName()
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