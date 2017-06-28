let superagent = require('superagent');

let logger = require('../../common/Logger').applicationWideLogger;
let utils = require('../../tacrpha/utils');

let CsvParser = require('../../format/csv/CsvParser');

class IPRDatasets {
	constructor(terms, type) {
		this._datasetEndpoint = "http://lod.gisat.cz/iprquery";
		this._terms = terms;
		this._type = type;
	}

	query() {
		var query = this._datasetEndpoint + '?query=';

		var filter = [];
		this._terms.map((value) => {
			value = utils.removeWordEnding(value);
			filter.push('regex(str(?ipr_sub), "' + value + '", "i")');
		});
		filter = 'FILTER(' + filter.join(this._type) + ')';

		var sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX owl: <http://www.w3.org/2002/07/owl#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>
			
			SELECT
				DISTINCT
				(?datasetName as ?dataset)
				(?ipr_obj as ?dataset_uri)
			WHERE {
				?ipr_sub common:isInContextOfDataset ?ipr_obj .
			
				?ipr_obj rdfs:label ?datasetName .
				${filter}
        }`;

		logger.info(`INFO iprquery#prepareTermsQuery sparql: ` + sparql);
		logger.info(`INFO iprquery#prepareTermsQuery full query: ` + query + sparql);

		return query + encodeURIComponent(sparql);
	}

	json() {
		return superagent.get(this.query()).then(result => {
			return new CsvParser(result.text).objects();
		});
	}
}

module.exports = IPRDatasets;