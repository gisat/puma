var Promise = require('promise');
var util = require('util');
var JsonOsmData = require('./JsonOsmData');

class LodAdministrativeUnits {
    constructor(place) {
        this._place = place;
    }

    query() {
        return Promise.resolve(
            util.format('' +
                'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
                'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
                'PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
                'PREFIX dcterms: <http://purl.org/dc/terms/> ' +
                'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
                'PREFIX ogc: <http://www.opengis.net/ont/geosparql#> ' +
                'PREFIX geom: <http://geovocab.org/geometry#> ' +
                'PREFIX spatial: <http://geovocab.org/spatial#> ' +
                'PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#> ' +
                'PREFIX lgdo: <http://linkedgeodata.org/ontology/> ' +
                'PREFIX meta: <http://linkedgeodata.org/meta/> ' +
                'PREFIX lgd-geom: <http://linkedgeodata.org/geometry/> ' +
                'PREFIX lgd: <http://linkedgeodata.org/triplify/> ' +
                'PREFIX gadm-o: <http://linkedgeodata.org/ld/gadm2/ontology/> ' +
                'PREFIX gadm-r: <http://linkedgeodata.org/ld/gadm2/resource/> ' +
                'PREFIX meta-o: <http://linkedgeodata.org/ld/meta/ontology/>  ' +
                '' +
                'Select * { ' +
                '   ?parent a gadm-o:Level ; rdfs:label ?parentLbl . ' +
                '   ?child rdfs:label ?name ; gadm-o:representedBy [ geom:geometry [ ogc:asWKT ?geo ] ] ; meta-o:parentLevel ?parent . ' +
                '   Filter(' +
                '       regex(?name,".*%s.*","i")' +
                '   ) . ' +
                '} ' +
                'Order By ?name  ', this._place));
    }

    json() {
        return this.query().then(query => {
            console.log(query);
            return new JsonOsmData(query).json();
        })
    }
}

module.exports = LodAdministrativeUnits;