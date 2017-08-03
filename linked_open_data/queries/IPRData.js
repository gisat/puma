let superagent = require('superagent');
let _ = require('underscore');
let Promise = require('promise');

let logger = require('../../common/Logger').applicationWideLogger;
let utils = require('../../tacrpha/utils');

let CsvParser = require('../../format/csv/CsvParser');

class IPRData {
	constructor(filters) {
		this._url = 'http://onto.fel.cvut.cz:7200/repositories/ipr_datasets?query=';

		this._filters = filters;
		this._dataset = null;
		this._colors = ['#ffffff','#FF0000','#00ff00','#0000ff','#50e8df','#d450e8','#e8db50','#323687'];
	}

	filter() {
		let triplets = [];
		let filters = [];
		let optionals = [];
		this._filters.forEach((filter, index) => {
			if (filter.values){
                this._dataset = filter.datasetUri;
                if (filter.type === 'string') {
                    triplets.push(`dataset:${filter.attributeKey} ?variable${index}`);
                    filters.push(`FILTER (?variable${index} IN ('${filter.values.join('\',\'')}'))`);
                } else if (filter.type === 'dateTimeStamp'){
                    let from = new Date(filter.values[0]);
                    from = from.getFullYear() + "-" + (from.getMonth()+1) + "-" + from.getDate();
                    let to = new Date(filter.values[1]);
                    to =to.getFullYear() + "-" + (to.getMonth()+1) + "-" + to.getDate();
                    optionals.push(`OPTIONAL {?ipr_o dataset:${filter.attributeKey} ?variable${index} FILTER (?variable${index} >= "${from}"^^xsd:date && ?variable${index} <= "${to}"^^xsd:date)}`);
                } else if (filter.type === 'integer' || filter.type === 'double') {
                    triplets.push(`dataset:${filter.attributeKey} ?variable${index}`);
                    filters.push(`FILTER (?variable${index} >= ${filter.values[0]} && ?variable${index} <= ${filter.values[1]})`);
                }
			}
		});

		return {
			triplets: triplets,
			filters: filters,
			optionals: optionals
		}
	}

	queryForAllData(amount) {
		let current = 0;
		let increment = 100000;
		let promise = Promise.resolve(null);
		let results = [];
		while(amount > current) {
			promise = this.queryPromise(promise, current, increment).then(result => {
				return new CsvParser(result.text).objects();
			}).then(objects => {
				results.push.apply(results, objects.map(object => object.geometry));
				return results;
			});

			current += increment;
		}

		return promise;
	}

	queryPromise(promise, current, increment) {
		return promise.then(() => {
			return superagent
                .get(this.limitedQuery(current, increment))
                .timeout({
                    response: 15000,  // Wait 15 seconds for the server to start sending,
                    deadline: 1200000, // but allow 10 minutes for the file to finish loading.
                });
		})
	}

	limitedQuery(current, increment) {
		let data = this.filter();

		let sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX owl: <http://www.w3.org/2002/07/owl#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>
			PREFIX dataset: <${this._dataset}>
			
			SELECT
			  ?geometry
			WHERE {
				?ipr_o dataset:wkt_geometry ?geometry;
					   ${data.triplets.join(';')}.
				
				${data.optionals.join(' ')}
				${data.filters.join(' ')}
			} 
			LIMIT ${increment}
			OFFSET ${current}
		`;
        
        logger.info(`IPRAttributes#limitedQuery Sparql: `, sparql);
        
        return this._url + encodeURIComponent(sparql);
    }
    
    countQuery() {
        let data = this.filter();
        
        let sparql = `
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX owl: <http://www.w3.org/2002/07/owl#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>
			PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>
			PREFIX dataset: <${this._dataset}>
			
			SELECT
			  (COUNT(?geometry) as ?amount)
			WHERE {
				?ipr_o dataset:wkt_geometry ?geometry;
					   ${data.triplets.join(';')}.
				
				${data.optionals.join(' ')}
				${data.filters.join(' ')}
			}
		`;
        
        logger.info(`IPRAttributes#countQuery Sparql: `, sparql);
        
        return this._url + encodeURIComponent(sparql);
    }
    
    json() {
        let amount = 0;
        return superagent.get(this.countQuery()).then(result => {
            return new CsvParser(result.text).objects();
        }).then(objects => {
            amount = objects[0].amount;
            return this.queryForAllData(amount);
        }).then(results => {
            return {
                color: this._colors[Math.floor(Math.random() * this._colors.length)],
                values: results,
                srid: this.srid(),
                amount: amount
            };
        });
    }
    
    srid() {
        return 5514
    }
    
    amount() {
        return values.length;
    }
}

module.exports = IPRData;