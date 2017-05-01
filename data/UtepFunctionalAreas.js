let Promise = require('promise');
let l

class UtepFunctionalAreas {
	constructor(app, pgPool) {
		this._pgPool = pgPool;

		app.get('/rest/functional-area/data', this.getAsCsv.bind(this));
	}

	getAsCsv(request, response, next) {
		let sets = request.params['sets'];
		let setsArray = sets.split('$');

		let resultCsv = 'State,High density clusters,Urban cluster,Rural area\n';

		let promise = Promise.resolve(null);
		setsArray.forEach((set, index) => {
			let options = set.split(';');
			var highDensityClusterOptions = options[0].split(',');
			var urbanClusterOptions = options[1].split(',');

			let hdcAmount;
			let ucAmount;
			promise = this._pgPool.query(this.getSql(` "SumI0B0" > ${highDensityClusterOptions[0]} AND "density" > ${highDensityClusterOptions[1]}`)).then(result => {
				hdcAmount = result.rows[0].amount;
				return this._pgPool.query(this.getSql(` "SumI0B0" > ${urbanClusterOptions[0]} AND "density" > ${urbanClusterOptions[1]} AND "SumI0B0" < ${highDensityClusterOptions[0]} AND "density" < ${highDensityClusterOptions[1]} `));
			}).then(result => {
				ucAmount = result.rows[0].amount;
				return this._pgPool.query(this.getSql(` "SumI0B0" < ${urbanClusterOptions[0]} OR "density" < ${urbanClusterOptions[1]}`));
			}).then(result => {
				resultCsv += `Set ${index + 1},${hdcAmount},${ucAmount},${result.rows[0].amount}\n`;
			});
		});

		promise.then(() => {
			resultCsv += ",0,0,0";
			response.set('Content-Type', 'text/csv');
			response.send(resultCsv);
		});
	}

	getSql(whereClause) {
		return `SELECT count(*) as amount FROM npl_gsi WHERE ${whereClause}`;
	}
}

module.exports = UtepFunctionalAreas;