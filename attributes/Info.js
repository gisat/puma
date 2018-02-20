var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');
let wellknown = require('wellknown');
let d3geo = require('d3-geo');

class Info {
    constructor(pgPool, schema) {
        this._schema = schema;
        this._pgPool = pgPool;
    }

    statistics(attributes, attributesMap, gids) {
        return attributes.attributes(this.sql.bind(this, gids)).then(attributes => {
            return attributes.map(attribute => {
                if (attribute._attributeSet){
                  var id = "as_" + attribute._attributeSet + "_attr_" + attribute._attribute;
                  return attribute.info({
                    units: attributesMap[id].units,
                    color: attributesMap[id].color,
                    value: attributesMap[id].value,
                    attributeId: attributesMap[id].attribute,
                    attributeName: attributesMap[id].attributeName,
                    attributeSetId: attributesMap[id].attributeSet,
                    attributeSetName: attributesMap[id].attributeSetName
                  })
                } else {
                    return attribute;
                }
            });
        }).then(json => {
            // Group per gid.
            var groupedPerRow = _.toArray(_.groupBy(_.flatten(json), element => element.gid));
            return groupedPerRow.map(group => {
                if(!group || group.length < 1) {
                    return;
                }
                // TODO: What should happen when attribue is twice from different attribute set?
                var result = {
                    gid: group[0].gid,
                    name: group[0].name,
                    geom: group[0].geom,
                    wgsExtent: group[0].wgsExtent,
                    attributes: []
                };
                group.forEach(value=> {
                    var attr = {
                        id: value.attributeId,
                        name: value.attributeName,
                        asId: value.attributeSetId,
                        asName: value.attributeSetName,
                        value: value.value,
                        units: value.units,
                        color: value.color
                    };
                    if (attr.id){
                      result.attributes.push(attr);
                    }
                });
                return result;
            }).filter(value => value);
        });
    };

    /**
     * Get gids bounding boxes
     * @param attributes {AttributesForInfo}
     * @param gids {Array} list of gids
     * @returns {Promise}
     */
    getBoundingBoxes(attributes, gids){
        let self = this;
        return attributes.getDataviewsForBbox().then(this.sqlForBboxes.bind(this,gids)).then(result => {
            let extents = [];
            if (result && result.length){
               result.map(data => {
                  data.rows.map(record => {
                      let jsonExtent = wellknown(record.extent);
                      let extent = self.getExtentForArea(jsonExtent, record.gid, record.tablename);
                      extents.push(extent);
                  });
               });
           }
           return Promise.all(extents);
        }).catch(err => {
            logger.error('Info#sqlForBboxes getBboxes',err);
        });
    };

    /**
     *
     * @param extent {JSON} extent of an the calculated by PostGIS
     * @param gid {string} id of gid
     * @param sourceTable {string} name of source table
     * @returns
     */
    getExtentForArea(extent, gid, sourceTable){
        let extentCoord = extent.coordinates[0];
        let minLon = 0;
        let maxLon = 0;
        extentCoord.map(coordinate =>{
            if (coordinate[0] < minLon){
                minLon = coordinate[0];
            }
            if (coordinate[0] > maxLon){
                maxLon = coordinate[0];
            }
        });

        /**
         * If the extent is suspiciously big, then it was probably calculated wrong by PostGIS. If so, use d3 and recalculate extent using
         * original geometry
         */
        if (Math.abs(minLon - maxLon) > 270){
            let self = this;
            return this.sqlForGeometry(gid, sourceTable).then(function(result){
                if (result && result.rows.length){
                    let geometry = result.rows[0].geometry;
                    let corners = self.calculateExtent(wellknown(geometry));
                    return self.getBoundingBoxFromCorners(corners);
                }
            });
        }

        /**
         * Else use original extent
         */
        else {
            extentCoord.pop();
            return new Promise(function(resolve,reject){
               resolve(extentCoord);
            });
        }
    }

    /**
     * It bounding box.
     * @param corners {Array} Bottom-left and upper-right corner of the bounding box
     * @returns {Array} 4 definition points of the area represented by [lon,lat] coordinates
     */
    getBoundingBoxFromCorners(corners){
        let points = [];

        let minLon = Number(corners[0][0]);
        let minLat = Number(corners[0][1]);
        let maxLon = Number(corners[1][0]);
        let maxLat = Number(corners[1][1]);
        points.push([minLon,minLat]);
        points.push([maxLon,minLat]);
        points.push([maxLon,maxLat]);
        points.push([minLon,maxLat]);
        return points;
    }

    /**
     * It converts list of points [lon,lat] to GeoJSON structure
     * @param points {Array} list of points
     * @returns {Object} GeoJSON
     */
    getGeoJsonFromPoints (points){
        let json = {
            "type": "FeatureCollection",
            "features": []
        };
        points.forEach(function(point){
            json["features"].push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": point
                }
            })
        });
        return json;
    };

    /**
     * Get bounding box from a list of [lon,lat] points
     * @param points
     * @returns {Array}
     */
    getExtentFromPoints(points){
        let json = this.getGeoJsonFromPoints(points);
        return d3geo.geoBounds(json);
    }

    /**
     * Calculate an enxtent for given geometry in GeoJSON
     * @param geometry {JSON}
     * @returns {Array} Bottom-left and upper-right corner of the bounding box
     */
    calculateExtent(geometry){
        return d3geo.geoBounds(geometry);
    }

    sqlForBboxes(gids, baseLayers){
        logger.info('Info#sqlForBboxes baseLayers', baseLayers);
        if (!Array.isArray(gids)){
            gids = [gids];
        }

        let values = [];
        gids.forEach(function (value) {
            values.push(value);
        });
        let list = "('" + values.join("','") + "')";


        return Promise.all(baseLayers
            .map(baseLayer => {
                return `SELECT ST_AsText(ST_Transform(ST_Envelope(the_geom), 4326)) as extent, gid, '${this._schema}.layer_${baseLayer._id}' as tablename FROM ${this._schema}.layer_${baseLayer._id} WHERE 
                        gid IN ${list}`
            })
            .map(sql => {
                logger.info('Info#sqlForBboxes Sql', sql);
                return this._pgPool.pool().query(sql)
            })
        );
    }

    sqlForGeometry(gid, sourceTable){
        let sql = `SELECT ST_AsText(ST_Transform(the_geom, 4326)) as geometry FROM ${sourceTable} WHERE gid = '${gid}'`;
        logger.info('Info#sqlForGeometry sql', sql);

        return this._pgPool.pool().query(sql);
    }

    sql(gids, baseLayers) {
        logger.info('Info#sql baseLayers', baseLayers);
        if (!Array.isArray(gids)){
            gids = [gids];
        }

        var values = [];
        gids.forEach(function (value) {
            values.push(value);
        });
        var list = "('" + values.join("','") + "')";


        return Promise.all(baseLayers
            .map(baseLayer => {
                let columnsToQuery = baseLayer.queriedColumns.join(',').trim();
                if(columnsToQuery !== '') {
                    columnsToQuery += ','
                }

                return `SELECT ${columnsToQuery} 
                        ST_AsText(ST_Transform(the_geom, 900913)) as geometry, ST_AsText(ST_Transform(the_geom, 4326)) as geomWgs, gid, '${baseLayer.location}' as location, '${baseLayer.areaTemplate}' as areaTemplate, name FROM ${this._schema}.layer_${baseLayer._id} WHERE 
                        gid IN ${list}`
            })
            .map(sql => {
                logger.info('Info#sql Sql', sql);
                return this._pgPool.pool().query(sql)
            })
        );
    }
}

module.exports = Info;