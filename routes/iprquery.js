var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var TacrPhaStatistics = require('../tacrpha/TacrPhaStatistics');
var utils = require('../tacrpha/utils');
let LodAdministrativeUnits = require('../melodies/LodAdministrativeUnits');

var request = require('request');
var Promise = require('promise');
var csv = require('csv');

class iprquery {
    constructor (app, pool) {
        app.post("/iprquery/dataset", this.attributesSearching.bind(this));
        app.post("/iprquery/terms", this.searching.bind(this));
        app.post("/iprquery/data", this.dataSearching.bind(this));
        app.post("/iprquery/object", this.objectSearching.bind(this));
        app.get("/iprquery/statistics", this.statistics.bind(this));
        app.get("/iprquery/adm", this.administrativeUnit.bind(this));

        this._datasetEndpoint = "http://onto.fel.cvut.cz:7200/repositories/ipr_datasets";
        this._prefixes = [
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>",
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
            "PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>",
            "PREFIX ds: <http://onto.fel.cvut.cz/ontologies/town-plan/>"
        ];

        this._statistics = new TacrPhaStatistics(pool);
    }

    /**
     * Return searching history statistics
     * @param req
     * @param res
     */
    statistics(req, res){
        let type = req.query.type;
        this._statistics.getSearchStringFrequency(type).then(function(result){
            logger.info(`INFO iprquery#statistics result: ` + result);
            let frequencies = [];
            result.rows.map(record => {
                frequencies.push([record.keywords, Number(record.num)]);
            });

            res.send(frequencies);
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR iprquery#statistics Error: `, err)
            )
        });
    }

    /**
     * Searching in objects
     * @param req
     * @param res
     */
    objectSearching(req, res){
        let dataset = req.body.dataset;
        let objectDs = req.body.objectDataset;
        let objectIds = req.body.objectIds;
        logger.info(`INFO iprquery#objectSearching params: ` + dataset + ' ' + objectDs + ' ' + objectIds);
        var sparql = this.prepareObjectQuery(dataset, objectDs, objectIds);
        logger.info(`INFO iprquery#objectSearching sparql: ` + sparql);
        this.endpointRequest(sparql).then(function(result){
            result.keywords =[objectDs + "/" + objectIds];
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
     * Searching in attributes
     * @param req
     * @param req.body.dataset {string} name of the dataset
     * @param res
     */
    attributesSearching(req, res){
        let dataset = req.body.dataset;
        var sparql = this.prepareDatasetQuery(dataset);
        debugger;
        this.endpointRequest(sparql).then(function(result){
            result.keywords = [dataset];
            res.send(result);
        });
    }

    /**
     * Basic method for searching
     * @param req
     * @param res
     */
    searching(req, res){
        let keywords = this.constructor.parseRequestString(req.body.search);
        var self = this;
        if (keywords.length == 0){
            logger.info(`INFO iprquery#dataset keywords: No keywords`);
            var json = {
                status: "OK",
                message: "Žádná klíčová slova pro vyhledávání. Klíčové slovo musí mít alespoň dva znaky a nesmí obsahovat rezervovaná slova pro SPARQL!",
                data: []
            };
            res.send(json);
        } else {
            let type = this.constructor.getTypeString(req.body.settings.type);
            logger.info(`INFO iprquery#dataset keywords: ` + keywords);

            var sparql = this.prepareTermsQuery(keywords, type);
            this.endpointRequest(sparql).then(function(result){
                result.keywords = keywords;
                res.send(result);
                self._statistics.insert(req.headers.origin, keywords, result);
            });
        }
    };

    /**
     * Prepare sparql query for object searching
     * @param dataset
     * @param objectDs
     * @param objectIds {String[]}
     * @returns {string}
     */
    prepareObjectQuery(dataset, objectDs, objectIds){
        var query = this._datasetEndpoint + '?query=';
        var prefixes = this._prefixes.join(' ') + ' PREFIX uri: <http://onto.fel.cvut.cz/ontologies/town-plan/' + objectDs + '/>';

        var filter = `(?ipr_sbj IN (${objectIds.map(id => `uri:${id}`).join(',')}))`;
        var select = '(?ipr_okt as ?hodnota) (?ipr_pkt as ?atribut) (?ipr_sbj as ?objekt)';
        var limit = 'LIMIT 100';

        var sparql = 'SELECT ' + select +
            ' WHERE {?ipr_sbj rdf:type ?dataset. ?ipr_sbj ?ipr_pkt ?ipr_okt.' +
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

        var filter = '(?ipr_d = ds:' + dataset +')';
        if (value.length > 0 && typeof value == "string"){
            var val = value.replace(/[^a-zA-Z0-9]/g, '.');
            val = utils.removeReservedWords(val);
            filter += ' && regex(str(?ipr_h), "^' + val + '$", "i")';
        }

        var select = '(?ipr_o as ?objekt) (?ipr_h as ?hodnota) (?ipr_d as ?tabulka)';
        var limit = 'LIMIT 1000';

        if (type == "count"){
            select = '(COUNT(?ipr_o) AS ?pocet)';
            limit = '';
        }

        var sparql = 'SELECT ' + select +
            ' WHERE {?ipr_o rdf:type ?ipr_d. ?ipr_o dataset:' + parameter + ' ?ipr_h' +
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

		var filter = [];
		values.map((value) => {
			value = utils.removeWordEnding(value);
			filter.push('regex(str(?ipr_sub), "' + value + '", "i")');
		});
		filter = 'FILTER(' + filter.join(type) + ')';

		var sparql = `
        ${prefixes}
        
        SELECT
            DISTINCT
            ?datasetName
            (?ipr_obj as ?datasetUri)
            ?commonName
        WHERE {
            ?ipr_sub common:isInContextOfDataset ?ipr_obj .
        
            ?ipr_sub rdfs:label ?commonName .
            ?ipr_obj rdfs:label ?datasetName .
            ${filter}
        }`;

        logger.info(`INFO iprquery#prepareTermsQuery sparql: ` + sparql);
        logger.info(`INFO iprquery#prepareTermsQuery full query: ` + query + sparql);

        return query + encodeURIComponent(sparql);
    }

    /**
     * Prepare sparql query for datasets
     * @param dataset {string} dataset code
     * @returns {string}
     */
    prepareDatasetQuery(dataset){
        var query = this._datasetEndpoint + '?query=';
        var prefixes = this._prefixes.join(' ');
        var sparql = ' SELECT (?ipr_att as ?atribut) (?ipr_code as ?kod) WHERE {?ipr_att common:isInContextOfDataset ?dataset . ?ipr_att common:isRepresentedAsDatabaseTableAttribute ?ipr_code. ';

        var filter = 'FILTER(regex(str(?dataset), "' + dataset + '", "i") && regex(str(?ipr_code), "' + dataset + '", "i"))';
        sparql += filter + '}';

        logger.info(`INFO iprquery#prepareTermsQuery sparql: ` + sparql);
        logger.info(`INFO iprquery#prepareTermsQuery full query: ` + query + prefixes + sparql);

        return query + encodeURIComponent(prefixes + sparql);
    }

    administrativeUnit(request, response) {
        new LodAdministrativeUnits(request.query.name).json().then(result => {
            console.log(result);
            response.json({
                "status": "ok"
            });
        });
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
        reqString = utils.removeReservedWords(reqString);
        reqString = utils.removeSpecialCharacters(reqString);
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