var Promise = require('promise');
var util = require('util');
var superagent = require('superagent');

class LodLandUse {
    constructor(pgPool, schema, table, units) {
        // Units specifies the area for which we want to retrieve the land use polygons.
        this._units = units;

        this._pgPool = pgPool;
        this._schema = schema;
        this._table = table;
    }

    query(unit, offset) {
        return `
            PREFIX lgd:<http://linkedgeodata.org/triplify/> 
            PREFIX lgdgeo:<http://www.w3.org/2003/01/geo/wgs84_pos#>
            PREFIX lgdont:<http://linkedgeodata.org/ontology/>
            PREFIX geonames:<http://www.geonames.org/ontology#>
            PREFIX clc: <http://geo.linkedopendata.gr/corine/ontology#>
            PREFIX gag: <http://geo.linkedopendata.gr/greekadministrativeregion/ontology#>
            PREFIX ogc: <http://www.opengis.net/ont/geosparql#>
            PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
            PREFIX geor: <http://www.opengis.net/def/rule/geosparql/>
            PREFIX strdf: <http://strdf.di.uoa.gr/ontology#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
            PREFIX cd: <http://melodiesproject.eu/CityDistricts/ontology#>
            PREFIX fa: <http://melodiesproject.eu/floodedAreas/ontology#>
            PREFIX ua: <http://geo.linkedopendata.gr/urban/ontology#>
            Prefix geom: <http://geovocab.org/geometry#>
            PREFIX bif: <http://www.openlinksw.com/schemas/bif#>
            
            SELECT ?lu ?area ?geo
            WHERE
            {
              ?part ua:hasCode ?lu .
              ?part ua:hasArea ?area .
              ?part ogc:hasGeometry ?geom .
              ?geom ogc:asWKT ?geo .
              Filter(geof:sfIntersects (?geo, "${unit.geo.value}"^^ogc:wktLiteral)) .
            } 
            ORDER BY ?lu
            OFFSET ${offset}
            Limit 10
        `;
    }

    insert() {
        return this._units.json().then(units => {
            return this.iterativeUnit(units, 0);
        });
    }

    iterativeUnit(units, current) {
        if(current < units.length) {
            return this.handleUnit(units[current]).then(() => {
                current++;
                return this.iterativeUnit(units, current);
            })
        } else {
            return true;
        }
    }

    handleUnit(unit, offset = 0, follow = true) {
        if(follow) {
            return this.request(this.query(unit, offset)).then(json => {
                if(json.length < 10) {
                    follow = false;
                }
                return this.store(json);
            }).then(() => {
                offset += 10;
                return this.handleUnit(unit, offset, follow);
            })
        } else {
            return true;
        }
    }

    store(json) {
        var promises = [];

        json.forEach(row => {
            var sql = `INSERT INTO ${this._schema}.${this._table} (lu, area, the_geom) VALUES ('${row.lu}','${row.area}','${row.geo}')`;

            promises.push(this._pgPool.pool().query(sql));
        });

        return Promise.all(promises);
    }

    request(query){
        return superagent
            .post('http://melodies-wp4.terradue.com/Strabon/Query')
            .type('form')
            .send('query=' + query)
            .send('format=GeoJSON')
            .send('handle=download')
            .send('submit=Query')
            .send('view=HTML')
    }
}

module.exports = LodLandUse;