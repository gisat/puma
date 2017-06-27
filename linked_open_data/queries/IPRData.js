let logger = require('../../common/Logger').applicationWideLogger;

class IPRData {
	constructor(filters) {
		this._url = 'http://onto.fel.cvut.cz:7200/repositories/ipr_datasets';

		this._filters = filters;
		this._colors = ['#ffffff','#FF0000','#00ff00','#0000ff','#50e8df','#d450e8','#e8db50','#323687','#000000'];
	}

	query() {
		// You basically say for each triplet what are the relevant filters.
		var query = this._url + '?query=';

		let dataSetFilter = this._datasets.map(dataset => {
			return dataset.uri;
		}).join(',');

		let sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX owl: <http://www.w3.org/2002/07/owl#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>
			PREFIX dataset: <${this._filters.uri}>
			
			SELECT
			  ?geometry
			WHERE {
				?ipr_o dataset:wkt_geometry ?geometry;
					   dataset:${filterName} ?ipr_d;
					   dataset:${filterName} ?ipr_d.
				
				FILTER(?ipt_o IN (${dataSetFilter}))
			}
		`;

		// It seems that the GeoSparql somehow doesnt work.

		logger.info(`IPRAttributes#query Sparql: `, sparql);

		return query + encodeURIComponent(sparql);
	}

	json() {


		return {
			color: this._colors[Math.floor(Math.random() * this._colors.length)],
			values: ['','']
		};
	}
}

module.exports = IPRData;