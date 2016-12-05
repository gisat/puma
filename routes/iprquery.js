var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var request = require('request');
var csv = require('csv');

module.exports = function (app) {

    app.post("/iprquery", function (req, res) {

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

        sparqlQuery.push("SELECT DISTINCT ?ds");
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
        sparqlQuery.push("} LIMIT 150");

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
    });
};