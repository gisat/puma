let PgSequentialQuery = require('../postgresql/PgSequentialQuery');

/**
 * It retrieves statistical information about the attributes in the PostgreSQL datastore.
 */
class Statistics {
    constructor(pgPool, schema) {
        this._pgPool = pgPool;
        this._schema = schema;
    }

    statistics(attributes, attributesMap, distribution) {
        return attributes.attributes(this.sql.bind(this)).then(attributes => {
            return attributes.map(attribute => attribute.json({
                classes: Number(distribution.classes),
                attributeName: attributesMap[attribute.name()].attributeName,
                attributeSetName: attributesMap[attribute.name()].attributeSetName,
                units: attributesMap[attribute.name()].units,
                standardUnits: attributesMap[attribute.name()].standardUnits,
                color: attributesMap[attribute.name()].color,
                active: attributesMap[attribute.name()].active
            }));
        });
    }

	/**
     * It queries the information about the baseLayers. I need to retain the structure which was there when all was used.
	 * @param baseLayers
	 * @returns {Promise.<*>}
	 */
	sql(baseLayers) {
		// It has to be restructured.
		let queries = baseLayers
			.filter(baseLayer => baseLayer.queriedColumns.length > 0)
			.map(baseLayer => {
			    let columnsToQuery = baseLayer.queriedColumns.join(',').trim();
                if(columnsToQuery !== '') {
                    columnsToQuery += ','
                }

			    return `SELECT ${columnsToQuery} 
                        '' as geometry, gid, '${baseLayer.location}' as location, '${baseLayer.areaTemplate}' as areaTemplate FROM ${this._schema}.layer_${baseLayer._id}`
			});

		return new PgSequentialQuery(this._pgPool).query(queries);
    }
}

module.exports = Statistics;