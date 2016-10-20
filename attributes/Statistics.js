var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

class Statistics {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }

    statistics(attributes, attributesMap, distribution) {
        return attributes.attributes(this.sql.bind(this)).then(attributes => {
            return attributes.map(attribute => attribute.json({
                classes: Number(distribution.classes),
                attributeName: attributesMap[attribute.name()].attributeName,
                attributeSetName: attributesMap[attribute.name()].attributeSetName
            }));
        });
    }

    sql(baseLayers) {
        return Promise.all(baseLayers
            .filter(baseLayer => baseLayer.queriedColumns.length > 0)
            .map(baseLayer => `SELECT ${baseLayer.queriedColumns.join(',')}, 
                        ST_AsText(ST_Transform(the_geom, 900913)) as geometry, gid, '${baseLayer.location}' as location, '${baseLayer.areaTemplate}' as areaTemplate FROM views.layer_${baseLayer._id}`)
            .map(sql => this._pgPool.pool().query(sql))
        );
    }
}

module.exports = Statistics;