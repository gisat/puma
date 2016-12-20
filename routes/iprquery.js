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
        app.post("/iprquery/data", this.dataSearching.bind(this));
        app.post("/iprquery/object", this.objectSearching.bind(this));

        this._datasetEndpoint = "http://onto.fel.cvut.cz:7200/repositories/ipr_datasets";
        this._prefixes = [
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>",
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
            "PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>",
            "PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>"
        ];
    }

    objectSearching(req, res){
        let dataset = req.body.dataset;
        let objectDs = req.body.objectDataset;
        let objectId = req.body.objectId;
        logger.info(`INFO iprquery#objectSearching params: ` + dataset + ' ' + objectDs + ' ' + objectId);
        var sparql = this.prepareObjectQuery(dataset, objectDs, objectId);
        logger.info(`INFO iprquery#objectSearching sparql: ` + sparql);
        this.endpointRequest(sparql).then(function(result){
            result.keywords =[objectDs + "/" + objectId];
            res.send(result);
        });
    }

    /**
     * Searching in data
     * @param req
     * @param req.body.dataset {string} name of the dataset
     * @param req.body.param {string} code of parameter
     * @param req.body.value {string} value of parameter
     * @param req.body.type {string} type of searching (data or count)
     * @param res
     */
    dataSearching(req, res){
        let dataset = req.body.dataset;
        let parameter = req.body.param;
        let value = req.body.value;
        let type = req.body.type;

        var sparql = this.prepareDataQuery(dataset, parameter, value, type);
        this.endpointRequest(sparql).then(function(result){
            result.keywords = [parameter];
            result.value = value;
            res.send(result);
        });
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
                sparql = this.prepareTermsQuery(keywords, type);
            } else if (category == "dataset"){
                sparql = this.prepareDatasetQuery(keywords, type);
            }

            this.endpointRequest(sparql).then(function(result){
                result.keywords = keywords;
                res.send(result);
            });
        }
    };

    prepareObjectQuery(dataset, objectDs, objectId){
        var query = this._datasetEndpoint + '?query=';
        var prefixes = this._prefixes.join(' ') + ' PREFIX uri: <http://onto.fel.cvut.cz/ontologies/town-plan/' + objectDs + '/>';

        var filter = '(?subjekt = uri:' + objectId +')';
        var select = '?objekt ?predikat ?subjekt';
        var limit = 'LIMIT 100';

        var sparql = 'SELECT ' + select +
            ' WHERE {?subjekt rdf:type ?dataset. ?subjekt ?predikat ?objekt.' +
            ' FILTER (' + filter +
            ')} ' + limit;

        logger.info(`INFO iprquery#prepareDataQuery sparql: ` + sparql);
        logger.info(`INFO iprquery#prepareDataQuery full query: ` + query + prefixes + sparql);

        return query + ' ' + encodeURIComponent(prefixes + sparql);
    }

    /**
     * Prepare SPARQL query for searching in data
     * @param dataset
     * @param parameter
     * @param value
     * @param type
     * @returns {string}
     */
    prepareDataQuery(dataset, parameter, value, type){
        var query = this._datasetEndpoint + '?query=';
        var prefixes = this._prefixes.join(' ') + ' PREFIX dataset: <http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/' + dataset + '/>';

        var filter = '(?dataset = ds:' + dataset +')';
        if (value.length > 0 && typeof value == "string"){
            var val = value.replace(/[^a-zA-Z0-9]/g, '.');
            filter += ' && regex(str(?hodnota), "' + val + '", "i")';
        }

        var select = '?objekt ?hodnota ?dataset';
        var limit = 'LIMIT 1000';

        if (type == "count"){
            select = '(COUNT(?objekt) AS ?pocet)';
            limit = '';
        }

        var sparql = 'SELECT ' + select +
            ' WHERE {?objekt rdf:type ?dataset. ?objekt dataset:' + parameter + ' ?hodnota' +
                ' FILTER (' + filter +
                ')} ' + limit;


        logger.info(`INFO iprquery#prepareDataQuery sparql: ` + sparql);
        logger.info(`INFO iprquery#prepareDataQuery full query: ` + query + prefixes + sparql);

        return query + ' ' + encodeURIComponent(prefixes + sparql);
    }

    /**
     * Prepare sparql query for terms
     * @param values {Array} values for searching
     * @param type {string} operators
     * @returns {string}
     */
    prepareTermsQuery(values, type){
        var query = this._datasetEndpoint + '?query=';
        var prefixes = this._prefixes.join(' ');
        var sparql = ' SELECT ?pojem ?dataset ?kod WHERE {?pojem common:isInContextOfDataset ?dataset . ?pojem common:isRepresentedAsDatabaseTableAttribute ?kod.';

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
     * @param values {Array} values for searching
     * @param type {string} operators
     * @returns {string}
     */
    prepareDatasetQuery(values, type){
        var query = this._datasetEndpoint + '?query=';
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