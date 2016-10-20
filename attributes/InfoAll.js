var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');

class InfoAll {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }

            statistics(attributes, attributesMap) {
        return attributes.attributes(this.sql.bind(this)).then(attributes => {
            return attributes.map(attribute => attribute.info({
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
                    geom: group[0].geom
                };
                group.forEach(value=> {
                    result[value.attributeName] = value.value;
                });
                return result;
            }).filter(value => value);
        });
    }

    sql(baseLayers) {
        return Promise.all(baseLayers
            .map(baseLayer => `SELECT ${baseLayer.queriedColumns.join(',')}, 
                        ST_AsText(ST_Transform(the_geom, 900913)) as geometry, gid, '${baseLayer.location}' as location, '${baseLayer.areaTemplate}' as areaTemplate, name FROM views.layer_${baseLayer._id}`)
            .map(sql => {
                logger.info('Info#sql Sql', sql);
                return this._pgPool.pool().query(sql)
            })
        );
    }
}

module.exports = InfoAll;