let _ = require('lodash');

let config = require('../config');

let GeoserverImporter = require('../layers/GeoServerImporter');

class GeotiffGenerator {
    constructor(pgLongPool, promiseQueue) {
        this._pgLongPool = pgLongPool;
        this._promiseQueue = promiseQueue;
    }

    /**
     * Export geotiff from pg raster table
     * @param sourceTable
     * @param sourceSchema
     * @param destinationFolder
     * @param colorMap
     * @param reclass
     * @returns {Promise<any> | * | Promise | Promise.<RESULT> | Promise.<TResult>}
     */
    exportPgRasterAsGeotiff(sourceTable, sourceSchema, destinationFolder, outputFileName, colorMap, reclass, sqlJoin, sqlWhere, stClip) {
        console.log(`#### exporting geotiff from ${sourceSchema}.${sourceTable}`);
        return Promise.resolve().then(() => {
            if (!sourceTable) {
                throw new Error(`Missing source table name!`);
            }
            if (!destinationFolder) {
                throw new Error(`Missing path to destination folder!`);
            }
        }).then(() => {
            let rast = stClip ? `ST_Union(ST_Clip("rast", ${stClip}))` : `ST_Union("rast")`;
            if (reclass) {
                rast = `ST_Reclass(${rast}, '${reclass.reclassexpr}', '${reclass.pixelType}')`;
            }
            if (colorMap) {
                rast = `ST_ColorMap(${rast}, '${colorMap.colorMap}', '${colorMap.method}')`
            }
            sqlJoin = sqlJoin ? ` ${sqlJoin}` : ``;
            sqlWhere = sqlWhere ? ` ${sqlWhere}` : ``;
            return this._pgLongPool.pool().query(`
                    SELECT
                      oid,
                      lowrite(lo_open(oid, 131072), tiff) AS num_bytes
                    FROM
                      (VALUES (lo_create(0),
                               ST_AsTiff((SELECT ${rast} AS rast FROM ${sourceSchema ? sourceSchema : "public"}.${sourceTable} AS r${sqlJoin}${sqlWhere}))
                      )) AS v(oid, tiff);
                `);
        }).then(results => {
            return this._pgLongPool.pool().query(`SELECT lo_export(${results.rows[0].oid}, '${destinationFolder}/${outputFileName ? outputFileName : sourceTable}.tiff');`)
                .then(() => {
                    return this._pgLongPool.pool().query(`SELECT lo_unlink(${results.rows[0].oid});`)
                });
        })
    }

    /**
     * Prepare geotiffs for given data
     * @param data
     * @param replaceExisting
     * @param pgSchema
     * @param useReclass
     * @param useColors
     * @returns data
     */
    prepareGeotiffs(data, replaceExisting, pgSchema, outputDirectory, useReclass, useColors, sqlJoin, sqlWhere, stClip) {
        return Promise.resolve().then(async () => {
            let geoServerImporter = new GeoserverImporter(
                config.geoserverHost + config.geoserverPath,
                config.geoserverUsername,
                config.geoserverPassword,
                "geonode",
                "datastore"
            );
            let generatorPromises = [];
            let outputData = [];

            let geoserverLayers = await geoServerImporter.getGeoserverLayers();

            for (let dataIndex in data) {
                if (!data[dataIndex].aoiCoverage) continue;

                let rasterType = data[dataIndex].satellite;
                let rasterName = data[dataIndex].key;
                let outputFileName = data[dataIndex].area ? `${data[dataIndex].key}_${data[dataIndex].area}` : rasterName;
                pgSchema = pgSchema ? pgSchema : `scenes`;

                outputData.push(data[dataIndex]);

                if (!geoserverLayers.includes(rasterName) || replaceExisting) {
                    this._promiseQueue.addToQueue(() => {
                        return this.generateGeotiff(
                            geoServerImporter,
                            rasterName,
                            pgSchema,
                            outputDirectory,
                            outputFileName,
                            rasterType,
                            useReclass,
                            useColors,
                            replaceExisting,
                            sqlJoin,
                            sqlWhere,
                            stClip
                        )
                    });
                }
            }
            await this._promiseQueue.isQueueEmpty();
            return outputData;
        });
    };

    /**
     * Generate geotiff and propagete it to geoserver
     */
    async generateGeotiff(geoserverImporter, rasterName, pgSchema, outputDirecotry, outputFileName, rasterType, useReclass, useColors, replaceExisting, sqlJoin, sqlWhere, stClip) {
        return this.exportPgRasterAsGeotiff(
            rasterName,
            pgSchema,
            outputDirecotry,
            outputFileName,
            useColors ? config.snow.rasters.colorMap[rasterType] : null,
            useReclass ? config.snow.rasters.reclass[rasterType] : null,
            sqlJoin,
            sqlWhere,
            stClip
        ).then(result => {
            let layerObject = {
                customName: outputFileName,
                systemName: outputFileName,
                file: `${outputDirecotry}/${outputFileName}.tiff`,
                type: "raster"
            };
            return geoserverImporter.importLayer(layerObject, replaceExisting);
        });
    }
}

module.exports = GeotiffGenerator;