const DataGetter = require(`./DataGetter`);

class DataController {
	constructor(app, pgPool) {
		this._app = app;
		this._pgPool = pgPool;

		this._dataGetter = new DataGetter(pgPool);

		this._app.post(`/rest/data/filtered`, this.getFilteredData.bind(this));
	}

	getFilteredData(request, response) {
		return this
			._dataGetter
			.get(request.body, request.session.user)
			.then((filteredData) => {
				response.status(200).send(filteredData);
			})
			.catch((error) => {
				console.log(error);
				response.status(500).send({
					success: false,
					message: error.message
				})
			})
	}
}

module.exports = DataController;