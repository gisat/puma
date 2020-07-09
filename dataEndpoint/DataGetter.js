const PgRelationsCrud = require(`../relations/PgRelationsCrud`);

const config = require(`../config`);

class DataGetter {
	constructor(pgPool) {
		this._pgPool = pgPool;

		this._pgRelationsCrud = new PgRelationsCrud(pgPool, config.pgSchema.relations);
	}

	get(filter, user) {
		if (filter.hasOwnProperty(`relationsFilter`)) {
			return this.getByRelationsFilter(filter, user);
		} else if (filter.hasOwnProperty(`dataSourceFilter`)) {
			return this.getByDataSourceFilter(filter, user);
		} else if (filter.hasOwnProperty(`dataFilters`)) {
			return this.getByDataFilters(filter, user);
		} else {
			return Promise.reject(new Error(`filter not specified`));
		}
	}

	getByRelationsFilter(filter, user) {
		console.log(filter);
		return Promise
			.all([
				this._pgRelationsCrud.get(
					`spatial`,
					{
						filter: filter.relationsFilter
					},
					user
				),
				this._pgRelationsCrud.get(
					`attribute`,
					{
						filter: {
							...filter.relationsFilter,
							attributeKey: {
								in: filter.attributeKey
							}
						}
					},
					user
				)
			])
			.then(([spatialRelations, attributeRelations]) => {
				console.log(spatialRelations, attributeRelations);
			})
	}

	getByDataSourceFilter(filter) {
		return Promise.reject(new Error(`under construction`));
	}

	getByDataFilters(filter) {
		return Promise.reject(new Error(`under construction`));
	}
}

module.exports = DataGetter;