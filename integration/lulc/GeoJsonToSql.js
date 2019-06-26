class GeoJsonToSql {
    constructor(geoJson, tableName, auIndex) {
        this._geoJson = geoJson;
        this._tableName = tableName;
        this._auIndex = auIndex;
    }

    sql() {
        const properties= this._geoJson.features[0].properties;
        const propertyKeys = Object.keys(properties);

        const columns = [], drops = [];
        propertyKeys.forEach(property => {
            if(property.indexOf('as') === 0) {
            	drops.push(`ALTER TABLE "${this._tableName}" DROP COLUMN IF EXISTS ${property} CASCADE;`);
                columns.push(`ALTER TABLE ${this._tableName} ADD COLUMN ${property} INTEGER;`);
            }
        });

        // const alterSql = columns.join(' ');

        const rows = [];
        this._geoJson.features.map(feature => {
            const keys = Object.keys(feature.properties);

            keys.forEach(key => {
                if(key.indexOf('as') === 0) {
                    rows.push(`UPDATE ${this._tableName} SET ${key} = ${feature.properties[key]} WHERE "AL${this._auIndex}_ID" = '${feature.properties["AL" + this._auIndex + '_ID']}';`);
                }
            });
        });

        // const updateSql = rows.join(' ');

        // return alterSql + updateSql;

        return [...drops, ...columns, ...rows];
    }
}

module.exports = GeoJsonToSql;