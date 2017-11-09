let _ = require(`lodash`);

let config = require(`../config`);

let ProcessManager = require(`./ProcessManager`);
let FileSystemManager = require(`./FileSystemManager`);
let ScenesStatisticsStorage = require(`./ScenesStatisticsStorage`);
let RasterPublisher = require(`./RasterPublisher`);
let GeoserverImporter = require(`../layers/GeoServerImporter`);

class ScenesManager {
    constructor(pgPool, pgLongPool) {
        this._pgPool = pgPool;
        this._pgLongPool = pgLongPool;
        this._processManager = new ProcessManager(this._pgPool);
        this._scenesStatisticsStorage = new ScenesStatisticsStorage(this._pgPool);
        this._rasterPublisher = new RasterPublisher(this._pgPool, this._pgLongPool);
        this._geoserverImporter = new GeoserverImporter(
            config.geoserverPath,
            config.geoserverUsername,
            config.geoserverPassword,
            config.snow.geoserverWorkspace
        );
        this._fileSystemManager = new FileSystemManager(this._pgPool);
    }

    getScenesStatistics(request) {
        let owner = request.session.user.id;
        let filter = request.body;

        let processTicket = this._processManager.getProcessKey(owner, filter);

        return this._processManager.getProcessesByKey(processTicket)
            .then((processes) => {
                if (!processes.length) {
                    return this._processManager.createProcess(owner, filter)
                        .then((processes) => {
                            this.getFilteredScenes(filter)
                                .then((scenes) => {
                                    return this.getStatisticsForFilteredScenes(scenes, filter);
                                })
                                .then((scenesStatistics) => {
                                    this._processManager.updateProcessByKey(processTicket, {
                                        data: scenesStatistics,
                                        success: true
                                    });
                                })
                                .catch((error) => {
                                    this._processManager.updateProcessByKey(
                                        processTicket,
                                        {
                                            message: error.message,
                                            success: false
                                        },
                                        true
                                    );
                                });
                            return processes;
                        });
                } else {
                    return processes;
                }
            })
            .then((processes) => {
                let process = processes[0];
                if (process.result) {
                    return process.result;
                } else {
                    return {
                        ticket: process.key,
                        success: true
                    }
                }
            });
    }

    getStatisticsForFilteredScenes(scenes, filter) {
        let statistics = [];
        scenes.forEach((scene) => {
            let sceneId = scene.key;
            let sceneKey = `scene_${sceneId}`;
            let satKey = scene.satellite;
            let sensorKey = scene.sensor;
            let date = scene.date;
            let areaType = filter.area.type;
            let areaKey = filter.area.value;
            statistics.push(
                this._scenesStatisticsStorage.getSceneStatistics(
                    sceneId,
                    date,
                    satKey,
                    sensorKey,
                    areaType,
                    areaKey
                ).then((sceneStatistics) => {
                    if (sceneStatistics) {
                        return sceneStatistics;
                    } else {
                        return this.getClassDistributionForSceneByFilter(scene, filter)
                            .then((classDistribution) => {
                                return {
                                    key: sceneKey,
                                    satellite: satKey,
                                    sensor: sensorKey,
                                    date: date,
                                    classDistribution: classDistribution
                                }
                            })
                            .then((sceneStatistic) => {
                                return this.getAoiCoverageForSceneByFilter(scene, filter)
                                    .then((aoi) => {
                                        sceneStatistic.aoiCoverage = aoi;
                                        return sceneStatistic;
                                    })
                            })
                            .then((sceneStatistics) => {
                                let outputFilePath = `${config.snow.paths.scenesGeotiffStoragePath}/${sceneKey}.tif`;
                                return this._fileSystemManager.isFileExists(outputFilePath)
                                    .then((exists) => {
                                        if (!exists) {
                                            return this._rasterPublisher.exportRasterFromPgTableToGeotiff(
                                                `scenes`, `scenes`, scene.filename, outputFilePath, `color_rast`
                                            ).then(() => {
                                                return this._geoserverImporter.importLayer(
                                                    {
                                                        type: `raster`,
                                                        systemName: sceneKey,
                                                        file: outputFilePath
                                                    },
                                                    true
                                                );
                                            })
                                        }
                                    })
                                    .then(() => {
                                        return this._scenesStatisticsStorage.insertSceneStatistics(
                                            sceneId, date, satKey, sensorKey, areaType, areaKey, sceneStatistics
                                        );
                                    }).then(() => {
                                        return sceneStatistics;
                                    })
                            })
                    }
                })
            )
        });
        return Promise.all(statistics);
    }

    getAoiCoverageForSceneByFilter(scene, filter) {
        let areaType = filter.area.type;
        let areaKey = filter.area.value;

        let query = [];
        query.push(`SELECT foo.rasterSize / foo.aoiSize * 100 AS aoi`);
        query.push(`FROM (VALUES (`);
        query.push(`(SELECT sum(st_area(the_geom))`);

        if (areaType === `key`) {
            query.push(`FROM public.areas WHERE "KEY" = '${areaKey}'),`);
        } else if(areaType === `noLimit`) {
            query.push(`FROM "public"."europe"), `);
        }

        query.push(`(SELECT sum(ST_Count(st_clip(s."reclass_rast", a."the_geom"))) * 250000`);
        query.push(`FROM "scenes"."scenes" AS s LEFT JOIN "scenes"."metadata" AS m ON m."filename" = s."filename"`);

        if (areaType === `key`) {
            query.push(`LEFT JOIN "public"."areas" AS a ON a."KEY"='${areaKey}'`);
        } else if(areaType === `noLimit`) {
            query.push(`LEFT JOIN "public"."europe" AS a ON a."the_geom" IS NOT NULL`);
        }

        query.push(`WHERE m."id" = ${scene.key})`);
        query.push(`)) AS foo(aoiSize, rasterSize);`);

        return this._pgLongPool.query(query.join(` `))
            .then((result) => {
                if (result.rows.length) {
                    return result.rows[0].aoi;
                } else {
                    return 0;
                }
            });
    }

    getClassDistributionForSceneByFilter(scene, filter) {
        let areaType = filter.area.type;
        let areaKey = filter.area.value;

        let query = [];
        query.push(`SELECT`);
        query.push(`(foo.pvc).value::integer AS value,`);
        query.push(`sum((foo.pvc).count)::integer AS count`);
        query.push(`FROM`);
        query.push(`(SELECT ST_ValueCount(ST_Clip(s.reclass_rast, a.the_geom)) AS pvc`);
        query.push(`FROM "scenes"."scenes" AS s`);
        query.push(`LEFT JOIN "scenes"."metadata" AS m ON m."filename"=s."filename"`);

        if (areaType === `key`) {
            query.push(`LEFT JOIN "public"."areas" AS a ON a."KEY"='${areaKey}'`);
        } else if(areaType === `noLimit`) {
            query.push(`LEFT JOIN "public"."europe" AS a ON a."the_geom" IS NOT NULL`);
        }

        query.push(`WHERE`);
        query.push(`m."id"=${scene.key}`);
        query.push(`) as foo`);
        query.push(`GROUP BY value ORDER BY value;`);

        return this._pgLongPool.query(query.join(` `))
            .then((result) => {
                let total = 0;
                let classDistribution = {};
                for (let row of result.rows) {
                    total += row.count;
                }
                for (let row of result.rows) {
                    classDistribution[config.snow.classDistribution[row.value].key] = row.count / total * 100;
                }
                return classDistribution;
            });
    }

    getFilteredScenes(filter) {
        let areaType = filter.area.type;
        let areaKey = filter.area.value;
        let timeRange = filter.timeRange;
        let sensors = [];
        let satellites = [];

        _.each(filter.sensors, (satellite_keys, sensor_key) => {
            sensors.push(sensor_key);
            satellites = _.concat(satellites, satellite_keys);
        });

        let query = [];
        query.push(`SELECT DISTINCT`);
        query.push(`m."id" AS key,`);
        query.push(`m."sat_key" AS satellite,`);
        query.push(`m."sensor_key" AS sensor,`);
        query.push(`m."date"::text AS date,`);
        query.push(`m."filename" AS filename`);
        query.push(`FROM "scenes"."metadata" AS m`);
        query.push(`LEFT JOIN "scenes"."scenes" AS s ON m."filename"=s."filename"`);

        if (areaType === `key`) {
            query.push(`LEFT JOIN "public"."areas" AS a ON a."KEY"='${areaKey}'`);
        } else if(areaType === `noLimit`) {
            query.push(`LEFT JOIN "public"."europe" AS a ON a."the_geom" IS NOT NULL`);
        }

        query.push(`WHERE`);
        query.push(`m."date" BETWEEN '${timeRange.start}' AND '${timeRange.end}'`);
        query.push(`AND m."sensor_key"=ANY(ARRAY['${sensors.join(`', '`)}'])`);
        query.push(`AND m."sat_key"=ANY(ARRAY['${satellites.join(`', '`)}'])`);
        query.push(`AND a."the_geom" && s."reclass_rast"`);
        query.push(`ORDER BY date;`);

        return this._pgLongPool.query(query.join(` `))
            .then((result) => {
                return result.rows;
            });
    }

    getScenesTotalCount() {
        return this._pgLongPool.query(
            `SELECT COUNT(*) FROM "scenes"."scenes";`
        ).then((result) => {
            return result.rows[0].count;
        });
    }
}

module.exports = ScenesManager;