var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var utils = require('../tacrpha/utils');

var request = require('request');
var Promise = require('promise');
var csv = require('csv');

class iprquery {
    constructor (app) {
        app.post("/iprquery/dataset", this.dataset.bind(this));
        app.post("/iprquery/terms", this.terms.bind(this));

        this._datasetEndpoint = "http://onto.fel.cvut.cz:7200/repositories/ipr_datasets";
        this._prefixes = [
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>",
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
            "PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>",
            "PREFIX ipr: <http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/>"
        ];
    }

    terms(req,res){
        let keywords = this.parseRequestString(req.body.search);
        logger.info(`INFO iprquery#dataset keywords: ` + keywords);

        let sparql = this.prepareTermsQuery(this._datasetEndpoint, keywords);
        this.endpointRequest(sparql).then(function(result){
            result.keywords = keywords;
            res.send(result);
        });
    }

    dataset(req, res){
        let keywords = this.parseRequestString(req.body.search);
        logger.info(`INFO iprquery#dataset keywords: ` + keywords);

        let sparql = this.prepareDatasetQuery(this._datasetEndpoint, keywords);
        this.endpointRequest(sparql).then(function(result){
            result.keywords = keywords;
            res.send(result);
        });
    }

    /**
     * Prepare keywords for searching
     * @param reqString {string} request string
     * @returns {Array} keywords
     */
    parseRequestString(reqString){
        logger.info(`INFO iprquery#parseRequestString reqString: ` + reqString);

        reqString = utils.replaceInterpunction(reqString);
        reqString = utils.removeDiacritics(reqString);
        var list = reqString.split(" ");

        return utils.removeMonosyllabics(list);
    }

    /**
     * Prepare sparql query for terms
     * @param url {string} sparql endpoint url
     * @param values {Array} values for searching
     * @returns {string}
     */
    prepareTermsQuery(url, values){
        var query = url + '?query=';

        var sparql = ' SELECT ';

        var selects = [];
        var where = [];
        var filter = [];
        values.map((value, index) => {
            selects.push('?pojem' + index);
            where.push('?pojem' + index + ' common:isInContextOfDataset ?dataset');
            filter.push('regex(str(?pojem' + index + '), "' + value + '", "i")');
        });
        selects = selects.join(' ') + ' ?dataset ';
        filter = 'FILTER(' + filter.join(' && ') + ')';
        where = 'WHERE {' + where.join(' . ') + ' ' + filter + '}';
        sparql += selects + where;
        logger.info(`INFO iprquery#prepareTermsQuery sparql: ` + sparql);

        var prefixes = this._prefixes.join(' ');
        logger.info(`INFO iprquery#prepareTermsQuery full query: ` + query + prefixes + sparql);

        return query + encodeURIComponent(prefixes + sparql);
    }

    /**
     * Prepare sparql query for datasets
     * @param url {string} sparql endpoint url
     * @param values {Array} values for searching
     * @returns {string}
     */
    prepareDatasetQuery(url, values){
        var query = url + '?query=';
        var prefixes = this._prefixes.join(' ');
        var sparql = prefixes + ' SELECT DISTINCT ?dataset WHERE {';

        var where = [];
        var filter = [];
        values.map((value, index) => {
            where.push('?item' + index + ' common:isInContextOfDataset ?dataset');
            filter.push('regex(str(?item' + index + '), "' + value + '", "i")');
        });
        where = where.join(' . ');
        filter = 'FILTER(' + filter.join(' && ') + ')';
        sparql += where + ' ' + filter + '}';
        logger.info(`INFO iprquery#prepareDatasetQuery sparql: ` + sparql);

        return query + ' ' + encodeURIComponent(sparql);
    }

    endpointRequest(sparql){
        return new Promise(function(resolve, reject){
            request(sparql, function (error, response, body) {
                let json = {};
                if (error) {
                    json.status = "ERROR";
                    json.message = "Endpoint není dostupný! (Error message: " + error + " )";
                    logger.error(`ERROR iprquery#endpointRequest request: ` + error);
                    resolve(json);
                } else if (response.statusCode >= 400){
                    json.status = "ERROR";
                    json.message = "Endpoint není dostupný! (Error message: " + response.statusCode + ": " + response.statusMessage + " )";
                    logger.error (`ERROR iprquery#endpointRequest request: ` + response.statusCode + ": " + response.statusMessage);
                    resolve(json);
                } else {
                    csv.parse(body, function(error, result){
                        if(error){
                            json.status = "ERROR";
                            json.message = error;
                            logger.error(`ERROR iprquery#endpointRequest csv.parse:` + error);
                            resolve(json);
                        } else {
                            var header = result[0];
                            json.status = "OK";
                            json.data = [];
                            result.map((item, i) => {
                                var record = {};
                                header.map((column, j) => {
                                    record[column] = item[j];
                                });

                                if (i > 0){
                                    json.data.push(record);
                                }
                            });
                            resolve(json);
                        }
                    });
                }
            });
        });
    }
}

module.exports = iprquery;