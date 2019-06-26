class GeoJsonToSql {
    constructor(geoJson, tableName, auIndex) {
        this._geoJson = geoJson;
        this._tableName = tableName;
        this._auIndex = auIndex;
    }

    alters() {
        const properties= this._geoJson.features[0].properties;
        const propertyKeys = Object.keys(properties);

        const columns = [];
        propertyKeys.forEach(property => {
            if(property.indexOf('as') === 0) {
                columns.push(`ALTER TABLE ${this._tableName} ADD COLUMN ${property} INTEGER;`);
            }
        });

        return columns;
    }

    updates() {
        const properties= this._geoJson.features[0].properties;
        const propertyKeys = Object.keys(properties);

        const rows = [];
        this._geoJson.features.map(feature => {
            const keys = Object.keys(feature.properties);

            keys.forEach(key => {
                if(key.indexOf('as') === 0) {
                    rows.push(`UPDATE ${this._tableName} SET ${key} = ${feature.properties[key]} WHERE "AL${this._auIndex}_ID" = '${feature.properties["AL" + this._auIndex + '_ID']}';`);
                }
            });
        });

        return rows;
    }
}

module.exports = GeoJsonToSql;