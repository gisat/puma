var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var utils = require('../tacrpha/utils');

var request = require('request');
var Promise = require('promise');
var csv = require('csv');

class iprquery {
    constructor (app) {
        app.post("/iprquery/dataset", this.searching.bind(this, "dataset"));
        app.post("/iprquery/terms", this.searching.bind(this, "terms"));

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

    /**
     * Basic method for searching
     * @param category {string} type of searching
     * @param req
     * @param res
     */
    searching(category, req, res){
        let sparql;
        let keywords = this.constructor.parseRequestString(req.body.search);
        if (keywords.length == 0){
            logger.info(`INFO iprquery#dataset keywords: No keywords`);
            var json = {
                status: "OK",
                message: "Žádná klíčová slova pro vyhledávání. Klíčové slovo musí mít alespoň dva znaky!",
                data: []
            };
            res.send(json);
        } else {
            let type = this.constructor.getTypeString(req.body.settings.type);
            logger.info(`INFO iprquery#dataset keywords: ` + keywords);

            if (category == "terms"){
                sparql = this.prepareTermsQuery(this._datasetEndpoint, keywords, type);
            } else if (category == "dataset"){
                sparql = this.prepareDatasetQuery(this._datasetEndpoint, keywords, type);
            }

            this.endpointRequest(sparql).then(function(result){
                result.keywords = keywords;
                res.send(result);
            });
        }
    }

    /**
     * Prepare sparql query for terms
     * @param url {string} sparql endpoint url
     * @param values {Array} values for searching
     * @param type {string} operators
     * @returns {string}
     */
    prepareTermsQuery(url, values, type){
        var query = url + '?query=';
        var prefixes = this._prefixes.join(' ');
        var sparql = ' SELECT ?pojem ?dataset WHERE {?pojem common:isInContextOfDataset ?dataset . ';

        var filter = [];
        values.map((value) => {
            filter.push('regex(str(?pojem), "' + value + '", "i")');
        });
        filter = 'FILTER(' + filter.join(type) + ')';
        sparql += filter + '}';

        logger.info(`INFO iprquery#prepareTermsQuery sparql: ` + sparql);
        logger.info(`INFO iprquery#prepareTermsQuery full query: ` + query + prefixes + sparql);

        return query + encodeURIComponent(prefixes + sparql);
    }

    /**
     * Prepare sparql query for datasets
     * @param url {string} sparql endpoint url
     * @param values {Array} values for searching
     * @param type {string} operators
     * @returns {string}
     */
    prepareDatasetQuery(url, values, type){
        var query = url + '?query=';
        var prefixes = this._prefixes.join(' ');
        var sparql = ' SELECT DISTINCT ?dataset WHERE {?item common:isInContextOfDataset ?dataset . ';

        var filter = [];
        values.map((value) => {
            filter.push('regex(str(?item), "' + value + '", "i")');
        });
        filter = 'FILTER(' + filter.join(type) + ')';
        sparql += filter + '}';

        logger.info(`INFO iprquery#prepareDatasetQuery sparql: ` + sparql);
        logger.info(`INFO iprquery#prepareDatasetQuery full query: ` + query + prefixes + sparql);

        return query + ' ' + encodeURIComponent(prefixes + sparql);
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

    /**
     * Prepare keywords for searching
     * @param reqString {string} request string
     * @returns {Array} keywords
     */
    static parseRequestString(reqString){
        logger.info(`INFO iprquery#parseRequestString reqString: ` + reqString);

        reqString = utils.replaceInterpunction(reqString);
        reqString = utils.removeDiacritics(reqString);
        var list = reqString.split(" ");

        return utils.removeMonosyllabics(list);
    }

    /**
     * Convert type of operator to symbol
     * @param type {string}
     * @returns {string} symbol
     */
    static getTypeString(type){
        var symbol = " && ";
        if (type == "or"){
            symbol = " || ";
        }
        return symbol;
    }
}

module.exports = iprquery;