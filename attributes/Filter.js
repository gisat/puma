var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

class Filter {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }

    statistics(attributes, attributesMap, requestAttributes) {
        return attributes.attributes(this.sql.bind(this, requestAttributes)).then(attributes => {
            return attributes.map(attribute => attribute.filter({
                value: attributesMap[attribute.name()].value,
                attributeName: attributesMap[attribute.name()].attributeName,
                attributeSetName: attributesMap[attribute.name()].attributeSetName
            }));
        });
    }

    sql(requestAttributes, baseLayers, mongoAttributes) {
        return Promise.all(baseLayers
            .map(baseLayer => `SELECT ${baseLayer.queriedColumns.join(',')}, 
                        ST_AsText(ST_Transform(the_geom, 900913)) as geometry, gid, '${baseLayer.location}' as location, '${baseLayer.areaTemplate}' as areaTemplate FROM views.layer_${baseLayer._id} WHERE 
                        ${this._generateWhere(baseLayer.queriedColumns, mongoAttributes, requestAttributes).join(' AND ')}`)
            .map(sql => {
                logger.info('Filter#dataViews Sql', sql);
                return this._pgPool.pool().query(sql)
            })
        );
    }

    _generateWhere(columns, mongoAttributes, requestAttributes) {
        return columns.map(column => {
            var id = Number(column.split('_')[3]);
            var attributeSetId = Number(column.split('_')[1]);
            var filteringValue = requestAttributes.filter(attribute => Number(attribute.attribute) == id && Number(attribute.attributeSet) == attributeSetId)[0].value;

            if(mongoAttributes[id].type == 'numeric') {
                return `${column} >= ${filteringValue[0]} AND ${column} <= ${filteringValue[1]}`;
            } else if (mongoAttributes[id].type == 'boolean') {
                return `${column}=${filteringValue}`;
            } else {
                return `${column}='${filteringValue}'`;
            }
        })
    }
}

module.exports = Filter;