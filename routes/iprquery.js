var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var request = require('request');
var csv = require('csv');

module.exports = function (app) {

    app.post("/iprquery", function (req, res) {

        var searchValue = req.body.search;
        var searchSelect = req.body.source;

        var url = "http://onto.fel.cvut.cz/openrdf-sesame/repositories/urban-ontology?query=";
        var url2 = "http://onto.fel.cvut.cz/openrdf-sesame/repositories/ipr-datasets?query=";

        var prefixes = [
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>",
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
            "PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>",
            "PREFIX ipr: <http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/>"
        ].join(" ");

        searchValue = prefixes + searchValue;

        url += encodeURIComponent(searchValue);
        url2 += encodeURIComponent(searchValue);

        if (searchSelect == 1) {
            console.log(url);
        } else {
            console.log(url2);
        }

        request((searchSelect == 1 ? url : url2), function (iprerr, iprres, iprbody) {
            var jsonRes = {};
            var body = "";
            if (!iprerr && iprres.statusCode == 200) {
                csv.parse(iprbody, function (csverr, csvdata) {
                    body += "<table cellpadding='5px' cellspacing='5px' style='text-align: left;'>";
                    for (var outputLine of csvdata) {
                        body += "<tr>";

                        for (var field of outputLine) {
                            body += "<td>" + field + "</td>";
                        }

                        body += "</tr>";
                    }
                    body += "</table>";
                    body += "<script>$( \"tr:odd\" ).css( \"background-color\", \"#bbbbff\" );</script>";
                    jsonRes['body'] = body;
                    res.status(200).json(jsonRes);
                });
            } else {
                jsonRes['body'] = iprbody;
            }
        });
    });
};