let _ = require(`lodash`);
let hash = require("object-hash");

let config = require(`../config`);

let ProcessManager = require(`./ProcessManager`);
let FileSystemManager = require(`./FileSystemManager`);
let ScenesManager = require(`./ScenesManager`);
let CompositesStatisticsStorage = require(`./CompositesStatisticsStorage`);
let RasterPublisher = require(`./RasterPublisher`);
let GeoserverImporter = require(`../layers/GeoServerImporter`);

class CompositeManager {
    constructor(pgPool, pgLongPool) {
        this._pgPool = pgPool;
        this._pgLongPool = pgLongPool;
        this._processManager = new ProcessManager(this._pgPool);
        this._compositesStatisticsStorage = new CompositesStatisticsStorage(this._pgPool);
        this._rasterPublisher = new RasterPublisher(this._pgPool, this._pgLongPool);
        this._geoserverImporter = new GeoserverImporter(
            config.geoserverPath,
            config.geoserverUsername,
            config.geoserverPassword,
            config.snow.geoserverWorkspace
        );
        this._fileSystemManager = new FileSystemManager(this._pgPool);
        this._scenesManager = new ScenesManager(this._pgPool, this._pgLongPool);

        this.backgroundDayCompositesGenerator();
    }

    getCompositesStatistics(request) {
        let owner = request.session.user.id;
        let filter = request.body;

        let processTicket = this._processManager.getProcessKey(owner, filter);

        return this._processManager.getProcessesByKey(processTicket, config.snow.developement)
            .then((processes) => {
                if (!processes.length) {
                    return this._processManager.createProcess(owner, filter)
                        .then((processes) => {
                            this.getFilteredScenes(filter)
                                .then((scenes) => {
                                    if (scenes.length) {
                                        return this.createCompositesFromScenes(
                                            scenes, filter.period
                                        );
                                    } else {
                                        return [];
                                    }
                                })
                                .then((composites) => {
                                    if (composites.length) {
                                        return this.getStatisticsForCompositesByFilter(composites, filter);
                                    } else {
                                        return [];
                                    }
                                })
                                .then((statistics) => {
                                    this._processManager.updateProcessByKey(
                                        processTicket,
                                        {
                                            data: statistics,
                                            success: true
                                        }
                                    );
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
                return this.getAverageDuration()
                    .then((duration) => {
                        let process = processes[0];
                        if (process.result) {
                            return process.result;
                        } else {
                            return {
                                ticket: process.key,
                                success: true,
                                avgDurationPerComposite: duration
                            }
                        }
                    });
            });
    }

    getStatisticsForCompositesByFilter(compositeKeys, filter) {
        let promises = [];
        compositeKeys.forEach((compositeKey) => {
            promises.push(
                this.getStatisticsForCompositeByFilter(compositeKey, filter)
            )
        });
        return Promise.all(promises);
    }

    getStatisticsForCompositeByFilter(compositeKey, filter) {
        let areaType = filter.area.type;
        let areaKey = filter.area.value;
        return this.getCompositeMetadata(compositeKey)
            .then((metadata) => {
                let statisticsObject = {
                    "key": `composite_${compositeKey}`,
                    "dateFrom": metadata.date_from,
                    "period": metadata.period,
                    "sensors": metadata.sensors,
                    "satellites": metadata.satellites,
                    "aoiCoverage": null,
                    "classDistribution": {}
                };
                return this._compositesStatisticsStorage.getStatistics(
                    compositeKey,
                    {
                        from: metadata.date_from,
                        to: metadata.date_to
                    },
                    metadata.satellites,
                    metadata.sensors,
                    areaType,
                    areaKey
                ).then((storedStatistics) => {
                    if (!storedStatistics) {
                        return this.getAoiCoverageForCompositeByFilter(compositeKey, filter)
                            .then((aoi) => {
                                statisticsObject.aoiCoverage = aoi;
                                return this.getClassDistributionForCompositeByFilter(compositeKey, filter);
                            }).then((classDistribution) => {
                                statisticsObject.classDistribution = classDistribution;
                                return this._compositesStatisticsStorage.insertStatistics(
                                    compositeKey,
                                    {
                                        from: metadata.date_from,
                                        to: metadata.date_to
                                    },
                                    statisticsObject.satellites,
                                    statisticsObject.sensors,
                                    areaType,
                                    areaKey,
                                    statisticsObject
                                );
                            }).then(() => {
                                return statisticsObject;
                            });
                    } else {
                        return storedStatistics;
                    }
                });
            });
    }

    getCompositeMetadata(compositeKey) {
        let query = [];

        query.push(`SELECT`);
        query.push(`composite_key,`);
        query.push(`date_from::text,`);
        query.push(`date_to::text,`);
        query.push(`period,`);
        query.push(`sensors,`);
        query.push(`satellites,`);
        query.push(`sources`);
        query.push(`FROM "composites"."metadata"`);
        query.push(`WHERE composite_key='${compositeKey}'`);

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                return result.rows[0];
            });
    }

    getAoiCoverageForCompositeByFilter(compositeKey, filter) {
        let areaType = filter.area.type;
        let areaKey = filter.area.value;

        let query = [];
        query.push(`SELECT foo.rasterSize / foo.aoiSize * 100 AS aoi`);
        query.push(`FROM (VALUES (`);
        query.push(`(SELECT sum(st_area(the_geom))`);

        if (areaType === `key`) {
            query.push(`FROM public.areas WHERE "KEY" = '${areaKey}'),`);
        } else if (areaType === `noLimit`) {
            query.push(`FROM "public"."europe"),`);
        }

        query.push(`(SELECT sum(ST_Count(st_clip(c."rast", a."the_geom"))) * 250000`);
        query.push(`FROM "composites"."composites" AS c`);
        query.push(`LEFT JOIN "composites"."metadata" AS m ON m."composite_key" = c."key"`);

        if (areaType === `key`) {
            query.push(`LEFT JOIN "public"."areas" AS a ON a."KEY" = '${areaKey}'`);
        } else if (areaType === `noLimit`) {
            query.push(`LEFT JOIN "public"."europe" AS a ON a."the_geom" IS NOT NULL`);
        }

        query.push(`WHERE c."key" = '${compositeKey}')`);
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

    getClassDistributionForCompositeByFilter(compositeKey, filter) {
        let areaType = filter.area.type;
        let areaKey = filter.area.value;

        let query = [];
        query.push(`SELECT`);
        query.push(`(foo.pvc).value::integer AS value,`);
        query.push(`sum((foo.pvc).count)::integer AS count`);
        query.push(`FROM`);
        query.push(`(SELECT ST_ValueCount(ST_Clip(c."rast", a."the_geom")) AS pvc`);
        query.push(`FROM "composites"."composites" AS c`);
        query.push(`LEFT JOIN "composites"."metadata" AS m ON m."composite_key" = c."key"`);

        if (areaType === `key`) {
            query.push(`LEFT JOIN "public"."areas" AS a ON a."KEY" = '${areaKey}'`);
        } else if (areaType === `noLimit`) {
            query.push(`LEFT JOIN "public"."europe" AS a ON a."the_geom" IS NOT NULL`);
        }

        query.push(`WHERE`);
        query.push(`c."key" = '${compositeKey}'`);
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

    createCompositesFromScenes(scenes, period) {
        if (period === 1) {
            return this.createDayComposites(scenes);
        } else {
            return this.createNDayComposites(scenes, period);
        }
    }

    createDayComposites(scenes, background) {
        return Promise.resolve().then(async () => {
            let compositesMetadata = {};
            scenes.forEach((scene) => {
                compositesMetadata[scene.date] = compositesMetadata.hasOwnProperty(scene.date) ? compositesMetadata[scene.date] : {
                    sensors: [],
                    satellites: [],
                    sources: []
                };
                compositesMetadata[scene.date].sensors = _.union(compositesMetadata[scene.date].sensors, [scene.sensor]);
                compositesMetadata[scene.date].satellites = _.union(compositesMetadata[scene.date].satellites, [scene.satellite]);
                compositesMetadata[scene.date].sources = _.union(compositesMetadata[scene.date].sources, [scene.key]);
            });

            let tasks = [];
            Object.keys(compositesMetadata).forEach((date) => {
                tasks.push(() => {
                        return this.createComposite(
                            {
                                from: date,
                                to: date,
                                period: 1,
                                sensors: compositesMetadata[date].sensors.sort(),
                                satellites: compositesMetadata[date].satellites.sort(),
                                sources: compositesMetadata[date].sources.sort()
                            }
                        )
                    }
                )
            });

            let promises = [];
            for (let task of tasks) {
                if (background) {
                    await new Promise((resolve) => {
                        task.call().then(() => {
                            resolve();
                        });
                    });
                } else {
                    promises.push(task.call());
                }
            }
            return Promise.all(promises);
        });
    }

    createNDayComposites(scenes, period) {
        return Promise.resolve().then(() => {
            let scenesByDate = _.groupBy(scenes, `date`);
            let groupsOfDates = _.filter(
                _.chunk(
                    Object.keys(scenesByDate), period
                ), (group) => {
                    return group.length === period;
                });

            let nDayPromises = [];
            groupsOfDates.forEach((groupOfDates) => {
                let dayPromises = [];
                groupOfDates.forEach((date) => {
                    dayPromises.push(
                        this.createDayComposites(scenesByDate[date])
                    );
                });
                nDayPromises.push(
                    Promise.all(dayPromises).then((dayCompositeKeys) => {
                        let promise = [];
                        dayCompositeKeys.forEach((compositeKey) => {
                            promise.push(
                                this.getCompositeMetadata(compositeKey)
                            )
                        });
                        return Promise.all(promise);
                    }).then((dayCompositeMetadatas) => {
                        dayCompositeMetadatas = _.flatten(dayCompositeMetadatas);
                        let combinationMetadata = {
                            from: dayCompositeMetadatas[0].date_from,
                            to: dayCompositeMetadatas[dayCompositeMetadatas.length - 1].date_from,
                            period: period,
                            sensors: _.uniq(
                                _.flatten(
                                    _.map(dayCompositeMetadatas, dayCompositeMetada => {
                                        return dayCompositeMetada.sensors;
                                    })
                                )
                            ).sort(),
                            satellites: _.uniq(
                                _.flatten(
                                    _.map(dayCompositeMetadatas, dayCompositeMetada => {
                                        return dayCompositeMetada.satellites;
                                    })
                                )
                            ).sort(),
                            sources: _.uniq(
                                _.map(dayCompositeMetadatas, dayCompositeMetada => {
                                    return dayCompositeMetada.composite_key;
                                })
                            ).sort()
                        };
                        return this.createComposite(combinationMetadata, true);
                    })
                );
            });

            return Promise.all(nDayPromises).then((nDayCompositeKeys) => {
                return _.flatten(nDayCompositeKeys);
            });

        });
    }

    createComposite(compositeMetadata, fromComposites) {
        let compositeKey = this.getCompositeKey(compositeMetadata);
        return this.checkForMissingMetadata(compositeKey, compositeMetadata)
            .then(() => {
                return this.isCompositeExists(compositeKey)
            })
            .then((exists) => {
                if (exists) {
                    return this.getCompositeMetadata(compositeKey)
                        .then((storedCompositeMetadata) => {
                            return [
                                exists,
                                _.difference(
                                    compositeMetadata.sources,
                                    storedCompositeMetadata.sources
                                )
                            ];
                        });
                } else {
                    return [exists, []];
                }
            })
            .then(([exists, missingSources]) => {
                if (!exists || missingSources.length) {
                    let durationStart = Date.now();
                    return Promise.resolve()
                        .then(() => {
                            if (!exists) {
                                return this.touchComposite(compositeKey)
                            } else if (missingSources.length) {
                                return this.setCompositeAsProcessing(compositeKey);
                            }
                        })
                        .then(() => {
                            if (!exists) {
                                return this.createBaseCompositeRast(
                                    compositeKey,
                                    compositeMetadata.sources[0],
                                    compositeMetadata.sources[1],
                                    fromComposites
                                )
                            }
                        })
                        .then(() => {
                            if (missingSources.length || compositeMetadata.sources.length > 2) {
                                return this.appendSourcesToComposite(
                                    compositeKey,
                                    compositeMetadata.sources,
                                    fromComposites,
                                    missingSources.length ? missingSources : null
                                );
                            }
                        })
                        .then(() => {
                            return this.createColoredComposite(compositeKey);
                        })
                        .then(() => {
                            let compositeSystemName = `composite_${compositeKey}`;
                            let compositePath = `${config.snow.paths.compositesGeotiffStoragePath}/${compositeSystemName}.tif`;
                            return this._rasterPublisher.exportRasterFromPgTableToGeotiff(
                                `composites`,
                                `composites`,
                                compositeKey,
                                compositePath,
                                `color_rast`,
                                `key`
                            ).then(() => {
                                return {
                                    type: `raster`,
                                    systemName: compositeSystemName,
                                    file: compositePath
                                }
                            })
                        })
                        .then((layer) => {
                            return this._geoserverImporter.importLayer(layer, true)
                        })
                        .then(() => {
                            return this.saveCompositeMetadata(compositeKey, compositeMetadata);
                        }).then(() => {
                            return this.setCompositeAsCreated(compositeKey);
                        })
                        .then(() => {
                            return this.insertDuration(compositeKey, Date.now() - durationStart);
                        })
                        .then(() => {
                            return compositeKey;
                        })
                } else {
                    return compositeKey;
                }
            });
    }

    checkForMissingMetadata(compositeKey, compositeMetadata) {
        let query = [];

        query.push(`SELECT *`);
        query.push(`FROM (`);
        query.push(`VALUES (`);
        query.push(`(`);
        query.push(`SELECT COUNT(*) :: INTEGER :: BOOLEAN`);
        query.push(`FROM "composites"."composites"`);
        query.push(`WHERE "key" = '${compositeKey}'`);
        query.push(`),`);
        query.push(`(`);
        query.push(`SELECT COUNT(*) :: INTEGER :: BOOLEAN`);
        query.push(`FROM "composites"."metadata"`);
        query.push(`WHERE "composite_key" = '${compositeKey}'`);
        query.push(`)`);
        query.push(`)`);
        query.push(`) AS foo(composite, metadata);`);

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                if (result.rows[0].composite && !result.rows[0].metadata) {
                    return this.saveCompositeMetadata(compositeKey, compositeMetadata);
                }
            });
    }

    saveCompositeMetadata(compositeKey, compositeMetadata) {
        return this.deleteCompositeMetadata(compositeKey)
            .then(() => {
                console.log(`#### Saving metadata for composite ${compositeKey}`);

                let query = [];

                query.push(`INSERT INTO "composites"."metadata" (`);
                query.push(`composite_key,`);
                query.push(`date_from,`);
                query.push(`date_to,`);
                query.push(`period,`);
                query.push(`sensors,`);
                query.push(`satellites,`);
                query.push(`sources`);
                query.push(`) VALUES (`);
                query.push(`'${compositeKey}',`);
                query.push(`'${compositeMetadata.from}',`);
                query.push(`'${compositeMetadata.to}',`);
                query.push(`${compositeMetadata.period},`);
                query.push(`ARRAY['${compositeMetadata.sensors.join(`', '`)}'],`);
                query.push(`ARRAY['${compositeMetadata.satellites.join(`', '`)}'],`);
                query.push(`ARRAY['${compositeMetadata.sources.join(`', '`)}']`);
                query.push(`);`);

                return this._pgPool.query(query.join(` `));
            });
    }

    setCompositeAsCreated(compositeKey) {
        let query = [];

        query.push(`UPDATE "composites"."composites"`);
        query.push(`SET processing = FALSE`);
        query.push(`WHERE key = '${compositeKey}';`);

        return this._pgPool.query(query.join(` `));
    }

    setCompositeAsProcessing(compositeKey) {
        let query = [];

        query.push(`UPDATE "composites"."composites"`);
        query.push(`SET processing = TRUE`);
        query.push(`WHERE key = '${compositeKey}';`);

        return this._pgPool.query(query.join(` `));
    }

    deleteCompositeMetadata(compositeKey) {
        let query = [];

        query.push(`DELETE FROM "composites"."metadata"`);
        query.push(`WHERE "composite_key" = '${compositeKey}';`);

        return this._pgPool.query(query.join(` `));
    }

    clipCompositeByPolygonOfEurope(compositeKey) {
        console.log(`#### Clipping composite ${compositeKey}`);
        let query = [];

        query.push(`BEGIN;`);
        query.push(`SET work_mem=1048576;`);
        query.push(`UPDATE "composites"."composites"`);
        query.push(`SET "rast" = foo."rast"`);
        query.push(`FROM (`);
        query.push(`SELECT ST_Clip(c."rast", e."the_geom") AS rast`);
        query.push(`FROM "composites"."composites" AS c`);
        query.push(`LEFT JOIN "public"."europe" AS e ON e."the_geom" IS NOT NULL`);
        query.push(`WHERE c."key" = '${compositeKey}'`);
        query.push(`) AS foo`);
        query.push(`WHERE "key" = '${compositeKey}';`);
        query.push(`COMMIT;`);

        return this._pgLongPool.query(query.join(` `));
    }

    createColoredComposite(compositeKey) {
        console.log(`#### Creating color composite for ${compositeKey}`);
        let query = [];

        query.push(`BEGIN;`);
        query.push(`SET work_mem=1048576;`);
        query.push(`UPDATE "composites"."composites"`);
        query.push(`SET "color_rast" = ST_ColorMap(`);
        query.push(`"rast",`);
        query.push(`'6 128 203 221\n`);
        query.push(`5 173 234 166\n`);
        query.push(`4 13 24 53\n`);
        query.push(`3 61 61 61\n`);
        query.push(`2 25 25 25\n`);
        query.push(`1 102 0 20\n`);
        query.push(`nv 0 0 0 0',`);
        query.push(`'NEAREST')`);
        query.push(`WHERE "key"='${compositeKey}';`);
        query.push(`COMMIT`);

        return this._pgLongPool.query(query.join(` `));
    }

    appendSourcesToComposite(compositeKey, sources, fromComposites, missingSources) {
        return Promise.resolve().then(async () => {
            let step = 0;
            let sourcesToAppend = missingSources ? missingSources : sources.slice(2);
            for(let source of sourcesToAppend) {
                console.log(
                    `#### Appending source ${source} to composite ${compositeKey} [${++step} of ${sourcesToAppend.length}]`
                );
                let query = [];

                query.push(`BEGIN;`);
                query.push(`SET work_mem=786432;`);
                query.push(`WITH rasters AS (`);
                query.push(`SELECT unnest(ARRAY [c."rast", s."${fromComposites ? 'rast' : 'reclass_rast'}"]) AS rast`);
                query.push(`FROM "composites"."composites" AS c`);

                if (fromComposites) {
                    query.push(`LEFT JOIN "composites"."metadata" AS m ON m."composite_key" = '${source}'`);
                    query.push(`LEFT JOIN "composites"."composites" AS s ON s."key" = m."composite_key"`);
                } else {
                    query.push(`LEFT JOIN "scenes"."metadata" AS m ON m.id = ${Number(source)}`);
                    query.push(`LEFT JOIN "scenes"."scenes" AS s ON s."filename" = m."filename"`);
                }

                query.push(`WHERE c."key" = '${compositeKey}')`);
                query.push(`UPDATE "composites"."composites"`);
                query.push(`SET rast = foo.rast FROM (SELECT st_union(ST_Clip(rast, g."the_geom"), 1, 'MAX') AS rast`);
                query.push(`FROM rasters`);
                query.push(`LEFT JOIN "public"."europe" AS g ON g."the_geom" IS NOT NULL`);
                query.push(`) AS foo`);
                query.push(`WHERE "key" = '${compositeKey}';`);
                query.push(`COMMIT;`);

                await this._pgLongPool.query(query.join(` `));
            }
        });
    }

    createBaseCompositeRast(compositeKey, first, second, fromComposites) {
        console.log(`#### Creating base composite ${compositeKey}`);
        let query = [];

        query.push(`BEGIN;`);
        query.push(`SET work_mem=786432;`);
        query.push(`UPDATE "composites"."composites"`);
        query.push(`SET "rast" = foo."rast"`);
        query.push(`FROM (`);

        if (first && second) {
            query.push(`SELECT ST_Union(ST_Clip(s."${fromComposites ? 'rast' : 'reclass_rast'}", g."the_geom"), 1, 'MAX') AS rast`);
        } else {
            query.push(`SELECT ST_Clip(s."reclass_rast", g."the_geom") AS rast`);
        }

        if (fromComposites) {
            query.push(`FROM "composites"."composites" AS s`);
            query.push(`LEFT JOIN "composites"."metadata" AS m ON m."composite_key"=s."key"`);
        } else {
            query.push(`FROM "scenes"."scenes" AS s`);
            query.push(`LEFT JOIN "scenes"."metadata" AS m ON m."filename"=s."filename"`);
        }

        query.push(`LEFT JOIN "public"."europe" AS g ON g."the_geom" IS NOT NULL`);

        if (fromComposites) {
            if (first && second) {
                query.push(`WHERE m."composite_key"=ANY(ARRAY['${first}', '${second}'])`);
            } else {
                query.push(`WHERE m."composite_key"='${first}'`);
            }
        } else {
            if (first && second) {
                query.push(`WHERE m."id"=ANY(ARRAY[${Number(first)}, ${Number(second)}])`);
            } else {
                query.push(`WHERE m."id"=${Number(first)}`);
            }
        }

        query.push(`) AS foo`);
        query.push(`WHERE "key"='${compositeKey}';`);
        query.push(`COMMIT;`);

        return this._pgLongPool.query(query.join(` `));
    }

    touchComposite(compositeKey) {
        let query = [];

        query.push(`INSERT INTO "composites"."composites"`);
        query.push(`(`);
        query.push(`key,`);
        query.push(`processing`);
        query.push(`) VALUES (`);
        query.push(`'${compositeKey}',`);
        query.push(`TRUE`);
        query.push(`);`);

        return this._pgPool.query(query.join(` `));
    }

    getFilteredScenes(filter) {
        let timeRange = filter.timeRange;
        let sensors = [];
        let satellites = [];

        _.each(filter.sensors, (satellite_keys, sensor_key) => {
            sensors.push(sensor_key);
            satellites = _.concat(satellites, satellite_keys);
        });

        let query = [];
        query.push(`SELECT DISTINCT`);
        query.push(`m."id"::text AS key,`);
        query.push(`m."sat_key" AS satellite,`);
        query.push(`m."sensor_key" AS sensor,`);
        query.push(`m."date"::text AS date,`);
        query.push(`m."filename" AS filename`);
        query.push(`FROM "scenes"."metadata" AS m`);
        query.push(`LEFT JOIN "scenes"."scenes" AS s ON m."filename"=s."filename"`);
        query.push(`LEFT JOIN "public"."europe" AS e ON e."the_geom" IS NOT NULL`);
        query.push(`WHERE`);
        query.push(`m."date" BETWEEN '${timeRange.start}' AND '${timeRange.end}'`);
        query.push(`AND m."sensor_key"=ANY(ARRAY['${sensors.join(`', '`)}'])`);
        query.push(`AND m."sat_key"=ANY(ARRAY['${satellites.join(`', '`)}'])`);
        query.push(`AND s."reclass_rast" && e."the_geom"`);
        query.push(`ORDER BY date;`);

        return this._pgLongPool.query(query.join(` `))
            .then((result) => {
                return result.rows;
            });
    }

    insertDuration(compositeKey, duration) {
        let query = [];

        query.push(`INSERT INTO "composites"."durations" (`);
        query.push(`key,`);
        query.push(`duration`);
        query.push(`) VALUES (`);
        query.push(`'${compositeKey}',`);
        query.push(`${duration});`);

        return this._pgPool.query(query.join(` `))
            .then(() => {
                return this.getAverageDuration();
            });
    }

    getAverageDuration() {
        let query = [];

        query.push(`SELECT avg(duration) AS duration FROM "composites"."durations";`);

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                if (result.rows.length) {
                    return result.rows[0].duration;
                } else {
                    return 0;
                }
            });
    }

    getCompositeKey(compositeMetadata) {
        return hash(compositeMetadata);
    }

    isCompositeExists(compositeKey) {
        return this.waitForCurrentlyProcessingComposite(compositeKey)
            .then(() => {
                return this._pgPool.query(
                    `SELECT COUNT(*) FROM "composites"."metadata" AS m
                            WHERE m."composite_key"='${compositeKey}'`
                )
            })
            .then((result) => {
                return !!Number(result.rows[0].count);
            })
    }

    waitForCurrentlyProcessingComposite(compositeKey) {
        return new Promise((resolve, reject) => {
            let interval = setInterval(() => {
                this.isCompositeProcessing(compositeKey)
                    .then((processing) => {
                        if (!processing) {
                            clearInterval(interval);
                            resolve();
                        }
                    });
            }, 1000);
        });
    }

    isCompositeProcessing(compositeKey) {
        let query = [];

        query.push(`SELECT processing`);
        query.push(`FROM "composites"."composites"`);
        query.push(`WHERE key = '${compositeKey}';`);

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                if (result.rows.length) {
                    return result.rows[0].processing;
                } else {
                    return false;
                }
            })
    }

    backgroundDayCompositesGenerator() {
        if (!config.snow.backgroundGenerator.enabled) return;
        return this.getAvailableDateBorders()
            .then((borders) => {
                console.log(`#### BG #### Time range ${borders.start} - ${borders.end}`);
                let parameters = config.snow.backgroundGenerator.dailyComposites;
                for (let combination of parameters.combinations) {
                    let filter = {
                        timeRange: {
                            start: borders.start,
                            end: borders.end
                        },
                        sensors: combination.sensors
                    };
                    console.log(`#### BG #### Filter`, filter);
                    this.getFilteredScenes(filter)
                        .then((scenes) => {
                            if (scenes.length) {
                                return this.createDayComposites(scenes, true);
                            }
                        });
                }
            });
    }

    getAvailableDateBorders(limit) {
        let query = [];

        query.push(`SELECT`);
        query.push(`min(date)::text AS start,`);
        query.push(`max(date)::text AS end`);
        query.push(`FROM "scenes"."metadata"`);
        query.push(`WHERE date IS NOT NULL`);

        if (limit && limit.from) {
            query.push(`AND date >= '${limit.from}'`);
        }

        if (limit && limit.to) {
            query.push(`AND date <= '${limit.to}'`);
        }

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                return {
                    start: result.rows[0].start,
                    end: result.rows[0].end
                }
            });
    }

    static clearUnfinishedComposites(pgPool) {
        let query = [];

        query.push(`DELETE FROM "composites"."composites"`);
        query.push(`WHERE processing IS TRUE;`);

        return pgPool.query(query.join(` `));
    }

    static clearMetadataWithoutComposites(pgPool) {
        let query = [];

        query.push(`DELETE FROM "composites"."metadata"`);
        query.push(`WHERE "composite_key" NOT IN (`);
        query.push(`SELECT "key" FROM "composites"."composites");`);

        return pgPool.query(query.join(` `));
    }

    static initDurationPgTable(pgPool) {
        return pgPool.query(
            `CREATE SCHEMA IF NOT EXISTS composites;`
        ).then(() => {
            pgPool.query(
                `CREATE TABLE IF NOT EXISTS "composites"."durations" (
                    id serial,
                    key varchar(50),
                    duration bigint
                );`
            );
        });
    }

    static initMetadataPgTable(pgPool) {
        return pgPool.query(
            `CREATE SCHEMA IF NOT EXISTS composites;`
        ).then(() => {
            return pgPool.query(
                `CREATE TABLE IF NOT EXISTS "composites"."metadata" (
                        id serial,
                        composite_key varchar(50),
                        date_from date,
                        date_to date,
                        period integer,
                        sensors text[],
                        satellites text[],
                        sources text[],
                        PRIMARY KEY (id),
                        UNIQUE (composite_key));
                    `
            );
        });
    }

    static initCompositesPgTable(pgPool) {
        return pgPool.query(
            `CREATE SCHEMA IF NOT EXISTS composites;`
        ).then(() => {
            return pgPool.query(
                `CREATE TABLE IF NOT EXISTS "composites"."composites" (
                        id serial,
                        key varchar(50),
                        rast raster,
                        color_rast raster,
                        processing boolean,
                        PRIMARY KEY(id),
                        UNIQUE (key));
                    `
            )
        }).then(() => {
            return pgPool.query(
                `CREATE INDEX IF NOT EXISTS composites_compsites_rast_idx ON "composites"."composites" USING gist(ST_ConvexHull(rast));`
            );
        }).then(() => {
            return pgPool.query(
                `CREATE INDEX IF NOT EXISTS composites_compsites_color_rast_idx ON "composites"."composites" USING gist(ST_ConvexHull(color_rast));`
            );
        })
    }
}

module.exports = CompositeManager;