var JsonOsmData = require('./JsonOsmData');
var util = require('util');
var Promise = require('promise');

class LodAmenities {
    /**
     * @param type School, Hospital or StopPosition or any other supported by OSM.
     * @param distance {Number} Distance in km as a Number
     * @param point {String} latitude, longitude
     */
    constructor(type, point, distance) {
        this.type = type;
        this.point = point;
        this.distance = distance;
    }

    query() {
        return Promise.resolve(util.format('' +
            'Prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            'Prefix ogc: <http://www.opengis.net/ont/geosparql#> ' +
            'Prefix geom: <http://geovocab.org/geometry#> ' +
            'Prefix lgdo: <http://linkedgeodata.org/ontology/>  ' +
            'Select ?name ?label ?geo From <http://linkedgeodata.org> ' +
            '{   ' +
            '?name     a lgdo:%s ;     rdfs:label ?label ;     geom:geometry [       ogc:asWKT ?geo     ] .    ' +
            'Filter (     ' +
            '   bif:st_intersects (?geo, bif:st_point (%s), %s)   ) . ' +
            '}', this.type, this.point, this.distance));
    }

    json() {
        return this.query().then(query => {
            return new JsonOsmData(query).json();
        })
    }
}

module.exports = LodAmenities;