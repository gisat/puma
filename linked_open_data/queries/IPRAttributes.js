let superagent = require('superagent');
let _ = require('lodash');

let logger = require('../../common/Logger').applicationWideLogger;
let utils = require('../../tacrpha/utils');

let CsvParser = require('../../format/csv/CsvParser');

class IPRAttributes {
	constructor(dataset) {
		this._url = 'http://onto.fel.cvut.cz:7200/repositories/ipr_datasets';
		this._dataset = dataset;
	}

	query() {
		let query = this._url + '?query=';

		let sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> 
			PREFIX owl: <http://www.w3.org/2002/07/owl#> 
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/> 
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>  
			PREFIX ufo: <http://onto.fel.cvut.cz/ontologies/ufo/>  
			
			SELECT ?attributeLabel ?attribute ?dataType WHERE {
				?dataset ufo:is_object_part_of <` + this._dataset + `>. 
				?attribute common:isDatabaseTableAttributeOfDatabaseTable ?dataset.
				?subject common:isRepresentedAsDatabaseTableAttribute ?attribute.
				?subject rdfs:label ?attributeLabel.
				?attribute common:hasDataType ?dataType
			}
		`;

		// Also get the type.
		logger.info(`IPRAttributes#query Sparql: `, sparql);
		return query + encodeURIComponent(sparql);
	}

	valuesQuery(attribute) {
		if(attribute.type === 'integer' || attribute.type === 'double') {
			return this.numberQuery(attribute);
		} else if (attribute.type === 'dateTimeStamp'){
            return this.dateQuery(attribute);
        } else {
			return this.stringQuery(attribute);
		}
	}

	numberQuery(attribute) {
		let query = this._url + '?query=';

		let sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX owl: <http://www.w3.org/2002/07/owl#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>
			PREFIX dataset: <http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/${attribute.datasetKey}/>
			
			SELECT
				(MIN(?kod) as ?minValue)
				(MAX(?kod) as ?maxValue)
			WHERE {
				?dataset dataset:${attribute.attributeKey} ?kod .
			}
		`;

		logger.info(`IPRAttributes#numberQuery Sparql: `, sparql);

		return query + encodeURIComponent(sparql);
	}

	dateQuery(attribute){
        let query = this._url + '?query=';

        let sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX owl: <http://www.w3.org/2002/07/owl#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>
			PREFIX dataset: <http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/${attribute.datasetKey}/>
			
			SELECT
				(MIN(?kod) as ?minValue)
				(MAX(?kod) as ?maxValue)
			WHERE {
				?dataset dataset:${attribute.attributeKey} ?kod .
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
			PREFIX dataset: <http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/${attribute.datasetKey}/>
			
			SELECT DISTINCT
				?kod
			WHERE {
				?dataset dataset:${attribute.attributeKey} ?kod .
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
            let resultsUnion = _.unionBy(pResults, 'attribute');
			results = resultsUnion.map(result => {
				let urlParts = result.attribute.split('/');
				let attributeKey = urlParts.pop();
				let datasetKey = urlParts.pop();
				let type = result.dataType.split('#')[1];
				return {
					attributeName: result.attributeLabel,
					attributeKey: attributeKey,
					datasetKey: datasetKey,
					type: type
				}
			})
		}).then(() => {
			let promise = Promise.resolve(null);

			results.forEach(result => {
				promise = promise.then(() => {
					return superagent.get(this.valuesQuery(result))
				}).then(response => {
					logger.info('IPRAttributes#json Response For: ', response);
					return new CsvParser(response.text).objects();
				}).then(objects => {
					if(objects.length === 0) {
						result.values = [];
					} else {
						if(result.type === 'integer' || result.type === 'double' || result.type === 'dateTimeStamp') {
                            result.values = [objects[0].minValue, objects[0].maxValue];
						} else {
                            result.values = objects.map(object => object.kod);
						}
					}
					return result;
				})
			});

			return promise;
		}).then(() => {
			let attributes = [];
			results.map(attribute => {
                let values = attribute.values;
                if (values.length > 0 && (values[0].length > 0 || values[1].length > 0)){
                    attributes.push(attribute);
                }
			});

            attributes = _.sortBy(attributes, [function(attribute) { return attribute.type; }]);

			return attributes;
		});
	}
}

module.exports = IPRAttributes;