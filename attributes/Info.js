var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');
let wellknown = require('wellknown');

let BoundingBox = require('../custom_features/BoundingBox');

class Info {
    constructor(pgPool, schema) {
        this._schema = schema;
        this._pgPool = pgPool;

        this.boundingBox = new BoundingBox();
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
        return attributes.getDataviewsForBbox().then(this.sqlForBoundingBoxes.bind(this,gids)).then(result => {
            let extents = [];
            if (result && result.length){
               result.map(data => {
                  data.rows.map(record => {
                      logger.info(`Info#getBoundingBoxes extent: `,record.extent);
                      logger.info(`Info#getBoundingBoxes gid: `,record.gid);
                      logger.info(`Info#getBoundingBoxes tablename: `,record.tablename);
                      let extent = self.getExtentForArea(record.extent, record.gid, record.tablename);
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
     * Check the extent of an area. If it was calculated wrong by PostGIS, use D3
     * @param originalExtent {string} extent of the area in WKT format
     * @param gid {string} id of gid
     * @param sourceTable {string} name of source table
     * @returns {Promise}
     */
    getExtentForArea(originalExtent, gid, sourceTable){
        let jsonExtent = wellknown(originalExtent);
        let extentCoord = jsonExtent.coordinates[0];
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
                    let corners = self.boundingBox.getExtentFromWkt(geometry);
                    return self.boundingBox.completeBoundingBox(corners);
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
     * @param gids {Array} list of areas
     * @param baseLayers {Object}
     * @returns {Promise}
     */
    sqlForBoundingBoxes(gids, baseLayers){
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

    /**
     * @param gid {Array} list of areas
     * @param sourceTable {string} name of source table
     */
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