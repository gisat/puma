class DataGetter {
	constructor(pgPool) {
		this._pgPool = pgPool;
	}

	get(filter) {
		return Promise.reject(new Error(`under construction`));
	}
}

module.exports = DataGetter;