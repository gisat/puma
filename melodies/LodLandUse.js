var Promise = require('promise');
var util = require('util');
var superagent = require('superagent');

class LodLandUse {
    constructor(units) {
        // Units specifies the area for which we want to retrieve the land use polygons.
        this._units = units;
    }

    query(unit) {
        // TODO start one, once the previous one is finished.
        return Promise.resolve(util.format('' +
            'PREFIX lgd:<http://linkedgeodata.org/triplify/> ' +
            'PREFIX lgdgeo:<http://www.w3.org/2003/01/geo/wgs84_pos#> ' +
            'PREFIX lgdont:<http://linkedgeodata.org/ontology/> ' +
            'PREFIX geonames:<http://www.geonames.org/ontology#> ' +
            'PREFIX clc: <http://geo.linkedopendata.gr/corine/ontology#> ' +
            'PREFIX gag: <http://geo.linkedopendata.gr/greekadministrativeregion/ontology#> ' +
            'PREFIX ogc: <http://www.opengis.net/ont/geosparql#> ' +
            'PREFIX geof: <http://www.opengis.net/def/function/geosparql/> ' +
            'PREFIX geor: <http://www.opengis.net/def/rule/geosparql/> ' +
            'PREFIX strdf: <http://strdf.di.uoa.gr/ontology#> ' +
            'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
            'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
            'PREFIX cd: <http://melodiesproject.eu/CityDistricts/ontology#> ' +
            'PREFIX fa: <http://melodiesproject.eu/floodedAreas/ontology#> ' +
            'PREFIX ua: <http://geo.linkedopendata.gr/urban/ontology#> ' +
            'Prefix geom: <http://geovocab.org/geometry#> ' +
            'PREFIX bif: <http://www.openlinksw.com/schemas/bif#> ' +
            'SELECT ?lu ?area ?geo ' +
            'WHERE {   ' +
            '   ?part ua:hasCode ?lu .   ' +
            '   ?part ua:hasArea ?area .   ' +
            '   ?part ogc:hasGeometry ?geom .   ' +
            '   ?geom ogc:asWKT ?geo .   ' +
            '   Filter(' +
            '       geof:sfIntersects (?geo, "%s"^^ogc:wktLiteral)) . ' +
            '} ' +
            'ORDER BY ?lu ' +
            'LIMIT 10', unit.geo.value))
    }

    request(query){
        console.log(query);
        return superagent
            .post('http://melodies-wp4.terradue.com/Strabon/Query')
            .type('form')
            .send('query=' + query)
            .send('format=GeoJSON')
            .send('handle=download')
            .send('submit=Query')
            .send('view=HTML')
    }

    json() {
        return this._units.json().then(units => {
            var queries = [];

            units.forEach(unit => {
                queries.push(this.query(unit));
            });

            return Promise.all(queries)
        }).then(queries => {
            var results = [];

            queries.forEach(query => {
                results.push(this.request(query));
            });

            return Promise.all(results);
        }).then(results => {
            console.log(results);
        })
    }
}

module.exports = LodLandUse;