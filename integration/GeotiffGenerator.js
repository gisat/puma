class GeotiffGenerator {
    constructor(pgLongPool) {
        this._pgLongPool = pgLongPool;
    }

    exportPgRasterAsGeotiff(sourceTable, sourceSchema, destinationFolder, colorMap, reclass) {
        return Promise.resolve().then(() => {
            if (!sourceTable) {
                throw new Error(`Missing source table name!`);
            }
            if (!destinationFolder) {
                throw new Error(`Missing path to destination folder!`);
            }
        }).then(() => {
            return this._pgLongPool.pool().query(`SET postgis.gdal_enabled_drivers = 'ENABLE_ALL';`);
        }).then(() => {
            let rast = `rast`;
            if (reclass) {
                rast = `ST_Reclass(${rast}, '${reclass.reclassexpr}', '${reclass.pixelType}')`;
            }
            if (colorMap) {
                rast = `ST_ColorMap(${rast}, '${colorMap.colorMap}', '${colorMap.method}')`
            }
            return this._pgLongPool.pool().query(`
                    SELECT
                      oid,
                      lowrite(lo_open(oid, 131072), tiff) AS num_bytes
                    FROM
                      (VALUES (lo_create(0),
                               ST_Astiff((SELECT st_union(${rast}) AS rast FROM ${sourceSchema? sourceSchema : "public"}.${sourceTable}))
                      )) AS v(oid, tiff);
                `);
        }).then(results => {
            return this._pgLongPool.pool().query(`SELECT lo_export(${results.rows[0].oid}, '${destinationFolder}/${sourceTable}.tiff');`)
                .then(() => {
                    return this._pgLongPool.pool().query(`SELECT lo_unlink(${results.rows[0].oid});`)
                });
        })
    }
}

module.exports = GeotiffGenerator;