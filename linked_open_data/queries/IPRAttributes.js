let superagent = require('superagent');
let _ = require('underscore');

let logger = require('../../common/Logger').applicationWideLogger;
let utils = require('../../tacrpha/utils');

let CsvParser = require('../../format/csv/CsvParser');

class IPRAttributes {
	constructor(terms, type) {
		this._url = 'http://lod.gisat.cz/iprquery';

		this._terms = terms;
		this._type = type;
	}

	query() {
		var query = this._url + '?query=';

		var filter = [];
		this._terms.map((value) => {
			value = utils.removeWordEnding(value);
			filter.push('regex(str(?ipr_o), "' + value + '", "i")');
		});
		filter = 'FILTER(' + filter.join(this._type) + ')';

		let sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX owl: <http://www.w3.org/2002/07/owl#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>
			
			SELECT
			  (?ipr_o as ?objekt)
			  ?label
			WHERE {
				?ipr_o ?ipr_p ?ipr_d;
					   rdfs:label ?label.
			    
			    FILTER(?ipr_d = rdf:Property)
				${filter}
			}
		`;

		// Also get the type.
		logger.info(`IPRAttributes#query Sparql: `, sparql);

		return query + encodeURIComponent(sparql);
	}

	typeQuery(attribute) {
		var query = this._url + '?query=';

		let sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX owl: <http://www.w3.org/2002/07/owl#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>
			PREFIX dataset: <${attribute.dataset}>
			
			SELECT
				?datatype
			WHERE {
				?ipr_o dataset:${attribute.key} ?kod .
				BIND(datatype(?kod) as ?datatype)
			} LIMIT 1
		`;

		logger.info(`IPRAttributes#typeQuery Sparql: `, sparql);

		return query + encodeURIComponent(sparql);
	}

	valuesQuery(attribute) {
		if(attribute.type == 'string') {
			return this.stringQuery(attribute);
		} else {
			return this.numberQuery(attribute);
		}
	}

	numberQuery(attribute) {
		var query = this._url + '?query=';

		let sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX owl: <http://www.w3.org/2002/07/owl#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>
			PREFIX dataset: <${attribute.dataset}>
			
			SELECT
				(MIN(?kod) as ?minValue)
				(MAX(?kod) as ?maxValue)
			WHERE {
				?ipr_o dataset:${attribute.key} ?kod .
			}
		`;

		logger.info(`IPRAttributes#numberQuery Sparql: `, sparql);

		return query + encodeURIComponent(sparql);
	}

	stringQuery(attribute) {
		var query = this._url + '?query=';

		let sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX owl: <http://www.w3.org/2002/07/owl#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>
			PREFIX dataset: <${attribute.dataset}>
			
			SELECT DISTINCT
				?kod
			WHERE {
				?ipr_o dataset:${attribute.key} ?kod .
			}
		`;

		logger.info(`IPRAttributes#stringQuery Sparql: `, sparql);

		return query + encodeURIComponent(sparql);
	}

	json() {
		let results = null;
		return superagent.get(this.query()).then(result => {
			return new CsvParser(result.text).objects();
		}).then(pResults => {
			pResults = pResults.filter(result => result.objekt.indexOf('http://onto.fel.cvut.cz/ontologies/town-plan/common/') === -1);
			results = pResults.map(result => {
				let urlParts = result.objekt.split('/');
				let key = urlParts.pop();
				let datasetUrl = urlParts.join('/') + '/';
				let datasetName = urlParts.pop().replace('databaseTable', '');
				return {
					name: result.label,
					objekt: result.objekt,
					dataset: datasetUrl,
					datasetName: datasetName,
					key: key
				}
			})
		}).then(() => {
			let promise = Promise.resolve(null);

			results.forEach(result => {
				promise = promise.then(() => {
					return superagent.get(this.typeQuery(result));
				}).then(response => {
					logger.info('IPRAttributes#json Response For: ', result);
					return new CsvParser(response.text).objects();
				}).then(objects => {
					if(objects.length == 0) {
						result.type = 'string';
					} else {
						result.type = objects[0].datatype.split('#')[1];
					}
					return result;
				})
			});

			return promise;
		}).then(() => {
			let promise = Promise.resolve(null);

			results.forEach(result => {
				promise = promise.then(() => {
					return superagent.get(this.valuesQuery(result))
				}).then(response => {
					logger.info('IPRAttributes#json Response For: ', response);
					return new CsvParser(response.text).objects();
				}).then(objects => {
					if(objects.length == 0) {
						result.values = [];
					} else {
						if(result.type == 'string') {
							result.values = objects.map(object => object.kod);
						} else {
							result.values = [objects[0].minValue, objects[0].maxValue];
						}
					}
					return result;
				})
			});

			return promise;
		}).then(() => {
			let datasetResults = _.groupBy(results, "datasetName");
			let keys = Object.keys(datasetResults);
			return keys.map(key => {
				return {
					name: key,
					attributes: datasetResults[key]
				};
			});
		});
	}
}

module.exports = IPRAttributes;