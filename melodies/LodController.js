var config = require('../config.js');
var request = require('request');
//var csv = require('csv');

class MellodiesLodController {
    constructor(app) {
        app.get('/lod/mellodies/data', this.data.bind(this));
        app.post('/iprquery', this.iprquery.bind(this));
    }

    data(request, response, next) {
        // We need to define what types of data we will be able to return.
        var area = request.params.area;
        var type = request.params.type;

        response.json([{
            geom: 'POINT()',
            name: 'Test',
            area: '4500',
            type: 'Developed'
        }, {
            geom: 'POINT()',
            name: 'Test 2',
            area: '4000',
            type: 'Developed'
        }]);
    }

    iprquery(req, res, next) {
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
    }
}

module.exports = MellodiesLodController;