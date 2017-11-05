let GeoserverImporter = require('../layers/GeoServerImporter');

class RasterPublisher {
    constructor(pgPool, pgLongPool) {
        this._pgPool = pgPool;
        this._pgLongPool = pgLongPool;
    }

    exportRasterFromPgTableToGeotiff(tableName, schemaName, rasterFileName, outputFilePath, rastColumn) {
        if(!tableName || !schemaName || !rasterFileName || !outputFilePath) {
            return Promise.reject(`Missing some arguments!`);
        }

        let query = [];

        query.push(`SELECT`);
        query.push(`foo.id AS id,`);
        query.push(`lowrite(lo_open(foo.id, 262144|131072), foo.tiff) AS bytes`);
        query.push(`FROM (`);
        query.push(`VALUES (`);
        query.push(`lo_create(0), ST_AsTIFF((`);
        query.push(`SELECT r."${rastColumn}" FROM "${schemaName}"."${tableName}" AS r`);
        query.push(`WHERE r."filename"='${rasterFileName}'), 'DEFLATE9'))`);
        query.push(`) AS foo(id, tiff);`);

        return this._pgLongPool.query(query.join(` `))
            .then((result) => {
                return result.rows[0].id;
            })
            .then((id) => {
                return this._pgLongPool.query(
                    `SELECT lo_export(${id}, '${outputFilePath}');`
                ).then(() => {
                    return this._pgLongPool.query(
                        `SELECT lo_unlink(${id});`
                    )
                });
            });
    }
}

module.exports = RasterPublisher;