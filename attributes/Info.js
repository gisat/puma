var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');

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
                        ST_AsText(ST_Transform(the_geom, 900913)) as geometry, gid, '${baseLayer.location}' as location, '${baseLayer.areaTemplate}' as areaTemplate, name FROM ${this._schema}.layer_${baseLayer._id} WHERE 
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