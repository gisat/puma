let PgSequentialQuery = require('../postgresql/PgSequentialQuery');

/**
 * It returns all the administrative units that complies with the requested filters. The filters can be numeric, boolean
 * or text. 
 */
class Filter {
    constructor(pgPool, schema) {
        this._pgPool = pgPool;
        this._schema = schema;
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
        let queries = baseLayers
			.map(baseLayer => `SELECT ${baseLayer.queriedColumns.join(',')},
                        '' as geometry, gid, '${baseLayer.location}' as location, '${baseLayer.areaTemplate}' as areaTemplate FROM ${this._schema}.layer_${baseLayer._id} WHERE 
                        ${this._generateWhere(baseLayer.queriedColumns, mongoAttributes, requestAttributes).join(' AND ')}`);

        return new PgSequentialQuery(this._pgPool).query(queries);
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
            } else if (mongoAttributes[id].type == 'text') {
                if (filteringValue[0].length == 0) {
                    return `${column} IS NOT NULL`;
                } else {
                    var values = [];
                    filteringValue.forEach(function (value) {
                        values.push(value);
                    });
                    var options = "('" + values.join("','") + "')";
                    return `${column} IN ${options}`;
                }
            }
        })
    }
}

module.exports = Filter;