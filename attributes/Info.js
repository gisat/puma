var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');

class Info {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }

    statistics(attributes, attributesMap, gids) {
        return attributes.attributes(this.sql.bind(this, gids)).then(attributes => {
            return attributes.map(attribute => attribute.info({
                units: attributesMap[attribute.name()].units,
                value: attributesMap[attribute.name()].value,
                attributeName: attributesMap[attribute.name()].attributeName,
                attributeSetName: attributesMap[attribute.name()].attributeSetName
            }));
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
                        name: value.attributeName,
                        value: value.value,
                        units: value.units
                    };
                    result.attributes.push(attr);
                });
                return result;
            }).filter(value => value);
        });
    }

    sql(gids, baseLayers) {
        logger.info('Info#sql baseLayers', baseLayers);
        var values = [];
        gids.forEach(function (value) {
            values.push(value);
        });
        var list = "('" + values.join("','") + "')";


        return Promise.all(baseLayers
            .map(baseLayer => `SELECT ${baseLayer.queriedColumns.join(',')}, 
                        ST_AsText(ST_Transform(the_geom, 900913)) as geometry, gid, '${baseLayer.location}' as location, '${baseLayer.areaTemplate}' as areaTemplate, name FROM views.layer_${baseLayer._id} WHERE 
                        gid IN ${list}`)
            .map(sql => {
                logger.info('Info#sql Sql', sql);
                return this._pgPool.pool().query(sql)
            })
        );
    }
}

module.exports = Info;