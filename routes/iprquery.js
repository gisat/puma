var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');
var http = require('http');

module.exports = function (app) {

    app.post("/iprquery", function (request, response) {

        var searchValue = request.body.search;

        response.status(200).json({search: searchValue});

        //response.status( 500 ).json( { message: "Nebyl nalezen žádný obsah!" } );

        var siteDomain = "onto.fel.cvut.cz/openrdf-sesame/repositories/urban-ontology";
        var url = "http://" + siteDomain + "?query=";
        var query = [
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>",
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
            "PREFIX common: <http://onto.fel.cvut.cz/ontologies/town-plan/common/>",
            "PREFIX ipr: <http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/>",
            "SELECT DISTINCT ?dataset WHERE { ",
            "?pojem1 common:isInContextOfDataset ?dataset . ?pojem2 common:isInContextOfDataset ?dataset FILTER (regex(str(?pojem1), \"dum\",\"i\") && regex(str(?pojem2), \"bydleni\", \"i\"))}"
        ].join(" ");
        url += encodeURIComponent(query);
        //url += "&format=json";
        $.ajax({
            dataType: 'json',
            url: url,
            success: function ( data ) {
                logger.error( JSON.stringify( data ) );
            }
        });

    });

}