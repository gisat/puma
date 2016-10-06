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
        return Promise.resolve(`Prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
            Prefix ogc: <http://www.opengis.net/ont/geosparql#> 
            Prefix geom: <http://geovocab.org/geometry#> 
            Prefix lgdo: <http://linkedgeodata.org/ontology/> 
            Select 
              ?name 
              ?label 
              ?geo 
              (
                bif:st_distance (bif:st_point(bif:st_xmin(?geo),bif:st_ymin(?geo)), bif:st_point (${this.point}))
              ) as ?proximity
            From <http://linkedgeodata.org> 
            {   
            ?name     a lgdo:${this.type} ;     rdfs:label ?label ;     geom:geometry [       ogc:asWKT ?geo     ] .   
            Filter (     
                bif:st_distance (bif:st_point(bif:st_xmin(?geo),bif:st_ymin(?geo)), bif:st_point (${this.point})) < ${this.distance}
             ) . 
            }`);
    }

    json() {
        return this.query().then(query => {
            return new JsonOsmData(query).json();
        })
    }
}

module.exports = LodAmenities;