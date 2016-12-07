var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var utils = require('../tacrpha/utils');

var request = require('request');
var csv = require('csv');

class iprquery {
    constructor (app) {
        //app.post("/iprquery/old", this.old.bind(this));
        app.post("/iprquery/dataset", this.dataset.bind(this));

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

    dataset(req, res){
        let json = {};
        let searchString = req.body.search;
        searchString = searchString.replace(/[,;]/gi, ' ');
        var keywords = searchString.split(" ");
        logger.info(`INFO iprquery#dataset keywords: ` + keywords);

        var sparql = this.prepareDatasetQuery(this._datasetEndpoint, keywords);
        request(sparql, function (error, response, body) {
            if (error) {
                json.status = "Error: " + error;
                res.send(json);
            } else {
                csv.parse(body, function(error, result){
                    var header = result[0];
                    json.status = "OK";
                    json.data = [];
                    result.map((item, i) => {
                        var record = {};
                        record[header] = item[0];

                        if (i > 0){
                            json.data.push(record);
                        }
                    });
                    res.send(json);
                });
            }
        });
    }

    /**
     * Prepare sparql query
     * @param url {string} sparql endpoint url
     * @param values {Array} values for searching
     * @returns {string}
     */
    prepareDatasetQuery(url, values){
        var query = url + '?query=';
        var sparql = this._prefixes.join(' ') + 'SELECT DISTINCT ?dataset WHERE {';

        var where = [];
        var filter = [];
        values.map((value, index) => {
            var keyword = utils.removeDiacritics(value);
            logger.info(`INFO iprquery#prepareDatasetQuery transform: ` + value + ` to: ` + keyword);

            where.push('?item' + index + ' common:isInContextOfDataset ?dataset');
            filter.push('regex(str(?item' + index + '), "' + keyword + '", "i")');
        });
        where = where.join(' . ');
        filter = 'FILTER(' + filter.join(' && ') + ')';
        sparql += where + ' ' + filter + '}';
        logger.info(`INFO iprquery#prepareDatasetQuery sparql: ` + sparql);

        return query + ' ' + encodeURIComponent(sparql);
    }

    old(req, res){
        var searchString = req.body.search;
        var searchSelect = req.body.source;
        searchString = searchString.replace(/ +(?= )/g, '');
        var searchValues = searchString.split(" ");

        var url = "http://onto.fel.cvut.cz/openrdf-sesame/repositories/urban-ontology?query=";
        var url2 = "http://onto.fel.cvut.cz/openrdf-sesame/repositories/ipr-datasets?query=";

        var prefixes = [
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>",
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
            "PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>",
            "PREFIX ipr: <http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/>"
        ];

        var sparqlQuery = prefixes.slice();

        sparqlQuery.push("SELECT ?ds ?dsp ?dso");
        sparqlQuery.push("WHERE {");
        sparqlQuery.push("?s ?p ?o .");
        sparqlQuery.push("FILTER (");

        for (var kwIndex in searchValues) {
            if (kwIndex > 0) {
                sparqlQuery.push("&&")
            }
            sparqlQuery.push("( " +
                "regex(STR(?s), \".*" + searchValues[kwIndex] + ".*\", \"i\") || " +
                "regex(STR(?p), \".*" + searchValues[kwIndex] + ".*\", \"i\") || " +
                "regex(STR(?o), \".*" + searchValues[kwIndex] + ".*\", \"i\") )");
        }

        sparqlQuery.push(")");
        sparqlQuery.push("?s common:isInContextOfDataset ?ds .");
        sparqlQuery.push("?ds ?dsp ?dso .");
        sparqlQuery.push("}");

        var searchValue = sparqlQuery.join(" ");
        console.log(searchValue);
        url += encodeURIComponent(searchValue);

        console.log(url);

        request(url, function (error, response, body) {
            var jsonRes = {};
            var htmlBody = "";
            if (!error && response.statusCode == 200) {
                csv.parse(body, function (error, data) {
                    htmlBody += "<table cellpadding='5px' cellspacing='5px' style='text-align: left;'>";
                    for (var outputLine of data) {
                        htmlBody += "<tr>";

                        for (var field of outputLine) {
                            htmlBody += "<td>" + field + "</td>";
                        }

                        htmlBody += "</tr>";
                    }
                    htmlBody += "</table>";
                    htmlBody += "<script>$( \"tr:first\" ).css( \"font-weight\", \"bold\" );</script>";
                    htmlBody += "<script>$( \"tr:odd\" ).css( \"background-color\", \"#bbbbff\" );</script>";
                    jsonRes['body'] = htmlBody;
                    res.status(200).json(jsonRes);
                    /*console.log(data);
                     var sparqlQuery2 = prefixes;
                     sparqlQuery2.push("SELECT *");
                     sparqlQuery2.push("WHERE {");
                     sparqlQuery2.push("?s ?p ?o");
                     sparqlQuery2.push("} LIMIT 250");
                     var searchValue2 = sparqlQuery2.join(" ");
                     console.log(searchValue2);
                     url2 += encodeURIComponent(searchValue2);
                     console.log(url2);*/
                    /*request(url2, function (error, response, body) {
                     csv.parse(body, function (error, data) {
                     htmlBody += "<table cellpadding='5px' cellspacing='5px' style='text-align: left;'>";
                     for (var outputLine of data) {
                     htmlBody += "<tr>";

                     for (var field of outputLine) {
                     htmlBody += "<td>" + field + "</td>";
                     }

                     htmlBody += "</tr>";
                     }
                     htmlBody += "</table>";
                     htmlBody += "<script>$( \"tr:first\" ).css( \"font-weight\", \"bold\" );</script>";
                     htmlBody += "<script>$( \"tr:odd\" ).css( \"background-color\", \"#bbbbff\" );</script>";
                     jsonRes['body'] = htmlBody;
                     res.status(200).json(jsonRes);
                     });
                     });*/
                });
            } else {
                jsonRes['body'] = body;
            }
        });
    }
}

module.exports = iprquery;