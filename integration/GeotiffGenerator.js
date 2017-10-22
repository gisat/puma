let _ = require('lodash');

let config = require('../config');

let GeoserverImporter = require('../layers/GeoServerImporter');

class GeotiffGenerator {
    constructor(pgLongPool) {
        this._pgLongPool = pgLongPool;
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

    /**
     * Prepare geotiffs for given data
     * @param data
     * @param replaceExisting
     * @param pgSchema
     * @param useReclass
     * @param useColors
     * @returns data
     */
    prepareGeotiffs(data, replaceExisting, pgSchema, outputDirectory, useReclass, useColors) {
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

            let layersMissingInGeoserver = !replaceExisting ? await geoServerImporter.getGeoserverMissingLayers(_.map(data, layerData => {return layerData.key})) : [];

            for (let dataIndex in data) {
                if (!data[dataIndex].aoiCoverage) continue;

                let rasterType = data[dataIndex].satellite;
                let rasterName = data[dataIndex].key;
                pgSchema = pgSchema ? pgSchema : `scenes`;

                outputData.push(data[dataIndex]);

                if(!replaceExisting && !layersMissingInGeoserver.includes(rasterName)) continue;

                await this.generateGeotiff(
                    geoServerImporter,
                    rasterName,
                    pgSchema,
                    outputDirectory,
                    rasterType,
                    useReclass,
                    useColors,
                    replaceExisting
                );
            }
            return outputData;
        });
    };

    /**
     * Generate geotiff and propagete it to geoserver
     */
    async generateGeotiff(geoserverImporter, rasterName, pgSchema, outputDirecotry, rasterType, useReclass, useColors, replaceExisting) {
        return this.exportPgRasterAsGeotiff(
            rasterName,
            pgSchema,
            outputDirecotry,
            useColors ? config.snow.rasters.colorMap[rasterType] : null,
            useReclass ? config.snow.rasters.reclass[rasterType] : null
        ).then(result => {
            let layerObject = {
                customName: rasterName,
                systemName: rasterName,
                file: `${config.snow.paths.scenesGeotiffStoragePath}/${rasterName}.tiff`,
                type: "raster"
            };
            return geoserverImporter.importLayer(layerObject, replaceExisting);
        });
    }
}

module.exports = GeotiffGenerator;