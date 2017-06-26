let logger = require('../../common/Logger').applicationWideLogger;
let utils = require('../../tacrpha/utils');

class IPRDatasets {
	constructor(terms) {
		this._datasetEndpoint = "http://onto.fel.cvut.cz:7200/repositories/ipr_datasets";
		this._prefixes = [
			"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
			"PREFIX owl: <http://www.w3.org/2002/07/owl#>",
			"PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
			"PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
			"PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>",
			"PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>"
		];

		this._terms = terms;
	}

	query() {
		var query = this._datasetEndpoint + '?query=';
		var prefixes = this._prefixes.join(' ');

		var filter = [];
		this._terms.map((value) => {
			value = utils.removeWordEnding(value);
			filter.push('regex(str(?ipr_sub), "' + value + '", "i")');
		});
		filter = 'FILTER(' + filter.join(type) + ')';

		var sparql = `
        ${prefixes}
        
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

	}
}

module.exports = IPRDatasets;