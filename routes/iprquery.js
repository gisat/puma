var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var request = require('request');

module.exports = function (app) {

    app.post("/iprquery", function (req, res) {

        var searchValues = req.body.search.split(" ");

        //response.status(200).json({search: searchValues});
        //response.status( 500 ).json( { message: "Nebyl nalezen žádný obsah!" } );

        var url = "http://onto.fel.cvut.cz/openrdf-sesame/repositories/urban-ontology?query=";
        var query = [
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>",
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
            "PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>",
            "PREFIX ipr: <http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/>"
        ];
        query = query.concat(["SELECT DISTINCT ?dataset WHERE {"]);

        for (var valueIndex in searchValues) {
            query = query.concat(["?pojem" + valueIndex + " common:isInContextOfDataset ?dataset"]);
            if( valueIndex < searchValues.length - 1 ){
                query = query.concat(["."]);
            }
        }

        query = query.concat(["FILTER ("]);

        for (var valueIndex in searchValues) {
            query = query.concat(["regex(str(?pojem" + valueIndex + "), \".*" + searchValues[valueIndex] + ".*\", \"i\")"]);
            if( valueIndex < searchValues.length - 1 ){
                query = query.concat(["&&"]);
            }
        }

        query = query.concat([")}"]);

        query = query.join(" ");

        console.log(query);

        url += encodeURIComponent(query);

        var content = "?";

        request('http://onto.fel.cvut.cz/openrdf-sesame/repositories/urban-ontology?query=' + encodeURIComponent(query), function (iprerr, iprres, iprbody) {
            if (!iprerr && iprres.statusCode == 200) {
                //console.log(iprbody); // Show the HTML for the Google homepage.
                res.status(200).send({content: iprbody});
            } else {
                res.status(500).send({message: iprbody});
            }
        });
    });
};