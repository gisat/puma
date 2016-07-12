var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var request = require('request');

module.exports = function (app) {

    app.post("/iprquery", function (req, res) {

        var searchValues = req.body.search.split(" ");
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
        ];
        var query = prefixes;
        query = query.concat(["SELECT DISTINCT ?dataset ?label WHERE {"]);
        query = query.concat(["?pojem common:isInContextOfDataset ?dataset."]);
        //query = query.concat(["?dataset common:ma_definici ?definice."]);
        query = query.concat(["?dataset rdfs:label ?label."]);

        query = query.concat(["FILTER ("]);

        for (var valueIndex in searchValues) {
            query = query.concat(["regex(str(?pojem), \"" + searchValues[valueIndex] + "\", \"i\")"]);
            if (valueIndex < searchValues.length - 1) {
                query = query.concat(["||"]);
            }
        }

        query = query.concat([")}"]);

        query = query.join(" ");

        url += encodeURIComponent(query);

        var query2 = prefixes;

        query2 = query2.concat(["SELECT DISTINCT *"]);
        query2 = query2.concat(["WHERE {"]);
        query2 = query2.concat(["?s ?p ?o"]);
        query2 = query2.concat(["} LIMIT 10"]);

        query2 = query2.join(" ");

        url2 += encodeURIComponent(query2);

        if (searchSelect == 1) {
            console.log(query);
        } else {
            console.log(query2);
        }

        request((searchSelect == 1 ? url : url2), function (iprerr, iprres, iprbody) {
            var jsonRes = {};
            var body = "";
            if (!iprerr && iprres.statusCode == 200) {
                var datasets = iprbody.split(/(?:\r\n|\r|\n)/g);
                var fields = datasets[0].split(",");

                datasets.splice(0, 1);
                datasets.splice(-1, 1);

                body += "<table cellpadding='5px' cellspacing='5px' style='text-align: left;'>";
                body += "<tr style='font-weight: bold;'>";
                body += "<td>" + fields[0] + "</td><td>" + fields[1] + "</td>";
                body += "</tr>";

                for (var dataset of datasets) {
                    dataset = dataset.split(",");
                    body += "<tr>";
                    body += "<td>" + dataset[0] + "</td><td>" + dataset[1] + "</td>";
                    body += "</tr>";
                }

                body += "</table>";
                jsonRes['body'] = body;
            } else {
                jsonRes['body'] = iprbody;
            }
            res.status(200).json(jsonRes);
        });
    });
};