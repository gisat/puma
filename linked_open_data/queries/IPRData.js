let superagent = require('superagent');
let _ = require('underscore');
let Promise = require('promise');
let randomColor = require('randomcolor');

let logger = require('../../common/Logger').applicationWideLogger;
let utils = require('../../tacrpha/utils');

let CsvParser = require('../../format/csv/CsvParser');
let ProjectionConventer = require('../../format/projection/ProjectionConverter');

class IPRData {
	constructor(filters, area, datasetUri) {
		this._url = 'http://onto.fel.cvut.cz:7200/repositories/ipr_datasets?query=';

		this._filters = filters;
		this._area = area;
        this._dataset = datasetUri;
	}

	filter() {
		let triplets = [];
		let filters = [];
		if (this._filters){
            this._filters.forEach((filter, index) => {
                if (filter.values){
                    triplets.push(`dataset:${filter.attributeKey} ?variable${index}`);
                    if (filter.type === 'string') {
                        filters.push(`FILTER (?variable${index} IN ('${filter.values.join('\',\'')}'))`);
                    } else if (filter.type === 'dateTimeStamp'){
                        let from = this.getDateString(filter.values[0]);
                        let to = this.getDateString(filter.values[1]);
                        filters.push(`FILTER (?variable${index} >= "${from}"^^xsd:date && ?variable${index} <= "${to}"^^xsd:date)`);
                    } else if (filter.type === 'integer' || filter.type === 'double') {
                        filters.push(`FILTER (?variable${index} >= ${filter.values[0]} && ?variable${index} <= ${filter.values[1]})`);
                    }
                }
            });
		}

		if (this._area){
			let conventer = new ProjectionConventer();
			let area5514 = conventer.convertWktEpsg4326ToEpsg5514(this._area);
            filters.push(`FILTER (geof:sfIntersects(?wktLiteral, "${area5514}"))`);
		}

		return {
			triplets: triplets,
			filters: filters
		}
	}

	queryForAllData(amount) {
		let current = 0;
		let amt = Number(amount);
		let increment = 10000;
		let promise = Promise.resolve(null);
		let results = [];
		while(amt > current) {
			promise = this.queryPromise(promise, current, increment).then(result => {
				return new CsvParser(result.text).objects();
			}).catch(err => {logger.error(err)}).then(objects => {
				results.push.apply(results, objects.map(object => object.wktLiteral));
				return results;
			}).catch(err => {logger.error(err)});

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

		let sparql = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX dataset: <${this._dataset}>
			PREFIX geo: <http://www.opengis.net/ont/geosparql#>
			PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
			PREFIX descriptor: <http://onto.fel.cvut.cz/ontologies/dataset-descriptor/>
			
			SELECT
			  ?wktLiteral
			WHERE {
				?object rdf:type <${this._dataset.slice(0, -1)}>.
    			?object descriptor:has-published-dataset-snapshot ?ipr_o.
				?ipr_o geo:hasGeometry ?geometry;
				${data.triplets.join(';')}.
				?geometry rdf:type geo:Geometry;
        				geo:asWKT ?wktLiteral.
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
        
        let sparql = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX dataset: <${this._dataset}>
			PREFIX geo: <http://www.opengis.net/ont/geosparql#>
			PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
			PREFIX descriptor: <http://onto.fel.cvut.cz/ontologies/dataset-descriptor/>
			
			SELECT
			  (COUNT(?geometry) as ?amount)
			WHERE {
				?object rdf:type <${this._dataset.slice(0, -1)}>.
    			?object descriptor:has-published-dataset-snapshot ?ipr_o.
				?ipr_o geo:hasGeometry ?geometry;
				${data.triplets.join(';')}.
				?geometry rdf:type geo:Geometry;
        				geo:asWKT ?wktLiteral.
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
                color: randomColor({luminosity: 'bright'}),
                values: results,
                srid: this.srid(),
                amount: amount
            };
        });
    }

    /**
	 * Get date in YYYY-MM-DD format
     * @param dateString {Date}
     * @returns {string}
     */
    getDateString (dateString){
        let date = new Date(dateString);
        let year = date.getFullYear();
        let month = ("0" + (date.getMonth()+1)).slice(-2); // add leading zero
		let day = ("0" + date.getDate()).slice(-2);

		return year + "-" + month + "-" + day;
	}
    
    srid() {
        return 5514
    }
    
    amount() {
        return values.length;
    }
}

module.exports = IPRData;