/**
 * SQL tables:
 * - composites.metadata
 *     Metadata for created composites, like start date, end date, satellites, sensors, area...
 *     Removing composites: delete row in this table, drop corresponding table and remove
 *     the layer from Geoserver.
 * - composites.statistics
 *     Cache for counted statistics of composites, like AIO covfefe and class distribution
 *     for combinations of composites and areas.
 *     This can be truncated in order to recalculation of statistics, which takes some time.
 * - public.scene_statistics
 *     Cache for counted statistics of scenes, like AOI coverage and class distribution
 *     for combinations of scenes and areas.
 *     This can be truncated in order to recalculation of statistics, which takes some time.
 *
 */

let _ = require("lodash");
let Promise = require("promise");
let hash = require("object-hash");

let logger = require('../common/Logger').applicationWideLogger;

let SnowPortalComposite = require('./SnowPortalComposite');


let processes = {};

class SnowPortal {
    constructor(app, pool, longRunningPool) {
        this._pgPool = pool;
        this._pgLongRunningPool = longRunningPool;

        this.initTables();

        app.get("/api/snowportal/scopeoptions", this.getScopeOptions.bind(this));
        app.post("/api/snowportal/scenes", this.getScenes.bind(this));
        app.post("/api/snowportal/composites", this.getComposites.bind(this));

        app.get("/rest/composites/metadata", this.getCompositesMetadata.bind(this));

        this._area = 'europe'; // TODO set dynamicaly?

        this._visibleClasses = ["S", "NS", "C", "NC"];
    }

    getCompositesMetadata(request, response) {
        this._pgPool.query(`SELECT * FROM composites.metadata ORDER BY date_start`).then(result => {
            response.json({metadata: result.rows});
        }).catch(err => {
            logger.error(`SnowPortal#getCompositeMetadata Error: `, err);
            response.status(500).json({status: "err"});
        });
    }

    /**
     * API scenes endpoint
     * @param request
     * @param response
     */
    getScenes(request, response) {
        let areaType = request.body.area.type;
        let areaValue = request.body.area.value;
        let areaString = areaType === 'noLimit' ? 'europe' : areaValue;
        let timeRangeStart = request.body.timeRange.start;
        let timeRangeEnd = request.body.timeRange.end;
        let sensors = [];
        let satellites = [];
        let existingStats = [];

        let requestData = request.body;
        let requestHash = hash(requestData);

        if (processes[requestHash]) {
            let responseObject = {};
            if (processes[requestHash].data) {
                responseObject.data = processes[requestHash].data;
                responseObject.success = true;
            } else if (processes[requestHash].error) {
                responseObject.message = processes[requestHash].error;
                responseObject.success = false;
            } else {
                responseObject.ticket = requestHash;
                responseObject.success = true;
            }
            response.send(responseObject);
            return;
        } else {
            processes[requestHash] = {
                started: Date.now(),
                ended: null,
                request: requestData,
                data: null,
                error: null
            };
        }

        _.each(request.body.sensors, (sensorSatellites, sensorKey) => {
            sensors.push(sensorKey);
            satellites = satellites.concat(sensorSatellites);
        });

        new Promise((resolve, reject) => {
            /**
             * Find existing stats for the current configuration (sensors, days and area)
             */

            let sql = this.findExistingSceneStatsSql(areaString, sensors, satellites, timeRangeStart, timeRangeEnd);
            this._pgPool.pool().query(sql).then(results => {
                if (results.rows.length) {
                    logger.info(`SnowPortal#getScenes ------ Found ${results.rows.length} existing scene stats.`);
                    resolve(_.map(results.rows, row => {
                        return {
                            key: row['scene_id'],
                            satellite: row['satellite_key'],
                            sensor: row['sensor_key'],
                            date: new Date(row['date']).toISOString().split("T")[0],
                            aoiCoverage: row['aoi_coverage'],
                            classDistribution: JSON.parse(row['class_distribution'])
                        };
                    }));
                } else {
                    logger.info(`SnowPortal#getScenes ------ No matching existing scene stats.`);
                    resolve([]);
                }
            }).catch(error => {
                reject(new Error(logger.error(`SnowPortal#getScenes ------ Getting existing scene stats Error: ${error.message} | ${error} | ${sql}`)));
            });
        }).then(existingStatsData => {
            /**
             * Compute statistics for all scenes, except existing stats.
             */

            return new Promise((resolve, reject) => {
                existingStats = existingStatsData;
                let sql = this.getScenesDataSql(areaType, areaValue, sensors, satellites, timeRangeStart, timeRangeEnd);
                this._pgLongRunningPool.pool().query(sql).then(results => {
                    logger.info(`SnowPortal#getScenes ------ Computing stats for scenes, SQL finished. Rows: `, results.rows.length);
                    let totals = {};
                    let scenes = {};

                    _.each(results.rows, row => {
                        let scene = scenes[row.key] || {};
                        let classDistribution = scene.classDistribution || {};

                        scene.key = row.key;
                        scene.satellite = row.satellite;
                        scene.sensor = row.sensor;
                        scene.date = row.date;
                        scene.aoiCoverage = row.coverage;

                        totals[scene.key] = totals[scene.key] + Number(row.count) || Number(row.count);

                        classDistribution[row.class] = row.count;
                        scene.classDistribution = classDistribution;

                        scenes[row.key] = scene;
                    });

                    _.each(scenes, scene => {
                        _.each(scene.classDistribution, (value, key) => {
                            scene.classDistribution[key] = 100 * (Number(value) / Number(totals[scene.key]));
                        });
                    });

                    // convert key-value object to array
                    let scenesArray = _.map(scenes, scene => {
                        return scene;
                    });

                    // sort scenes by date
                    scenesArray.sort((a, b) => {
                        if (a.date < b.date) {
                            return -1;
                        }
                        if (a.date > b.date) {
                            return 1;
                        }
                        return 0;
                    });

                    logger.info(`SnowPortal#getScenes ------ Computing stats for scenes finished. Rows: `, results.rows.length, ` Scenes: `, scenesArray.length);

                    resolve(scenesArray);
                }).catch(error => {
                    reject(new Error(logger.error(`SnowPortal#getScenes ------ Computing stats for scenes Error: ${error.message} | ${error} | ${sql}`)));
                });

            });
        }).then(newStatsData => {
            /**
             * save new stats to DB
             */

            return new Promise((resolve, reject) => {
                let sql = this.saveSceneStatsSql(newStatsData, areaString);
                this._pgPool.pool().query(sql).then(() => {
                    logger.info(`SnowPortal#getScenes ------ Successfuly saved new statistics to database.`);
                    resolve(newStatsData);
                }).catch(error => {
                    // don't stop if saving failed, only show warning
                    logger.warn(`SnowPortal#getScenes ------ Saving new scenes stats error: ${error.message} | ${error} | ${sql}`);
                    resolve(newStatsData);
                });
            });

        }).then(newStatsData => {
            /**
             * Combine existing and new data
             */
            return _.union(existingStats, newStatsData);
        }).then(data => {
            /**
             * filter classes we want to see in statistics
             */

            return _.map(data, scene => {
                let total = 0;
                let visibleTotal = 0;
                let classDistribution = {};

                _.each(scene.classDistribution, (value, key) => {
                    total += value;
                    if (this._visibleClasses.includes(key)) {
                        visibleTotal += value;
                    }
                });

                _.each(scene.classDistribution, (value, key) => {
                    if (this._visibleClasses.includes(key)) {
                        classDistribution[key] = 100 * (Number(value) / Number(visibleTotal));
                    }
                });

                scene.aoiCoverage *= (visibleTotal / total) || 0;
                scene.classDistribution = classDistribution;
                return scene;
            });

        }).then(data => {
            processes[requestHash].ended = Date.now();
            processes[requestHash].data = data;
        }).catch(error => {
            logger.error(`SnowPortal#getScenes Error: ${error}`);
            processes[requestHash].ended = Date.now();
            processes[requestHash].error = error.message || error || 'Unknown error';
        });

        response.send({
            ticket: requestHash,
            success: true
        });
    }

    /**
     * API composites endpoint
     * @param request
     * @param response
     */
    getComposites(request, response) {
        let requestData = request.body;
        let requestHash = hash(requestData);

        /**
         * existing process, return ticket or data
         */

        if (processes[requestHash]) {
            let responseObject = {};
            if (processes[requestHash].data !== null) {
                logger.info(`SnowPortal#getComposites ended succesfuly.`);
                responseObject.data = processes[requestHash].data;
                responseObject.success = true;
            } else if (processes[requestHash].error || processes[requestHash].ended) {
                let dateEnded = processes[requestHash].ended ? new Date(processes[requestHash].ended).toISOString() : processes[requestHash].ended;
                logger.error(`SnowPortal#getComposites ended ${dateEnded} with Error:`);
                logger.error(processes[requestHash].error);
                responseObject.message = processes[requestHash].error.message || processes[requestHash].error;
                responseObject.success = false;
            } else {
                responseObject.ticket = requestHash;
                responseObject.success = true;
            }
            response.send(responseObject);
            return;
        }


        /**
         * not existing process
         */

        // create new one
        processes[requestHash] = {
            started: Date.now(),
            ended: null,
            request: requestData,
            data: null,
            error: null
        };

        // get process data
        Promise.resolve().then(() => {
            let timeRangeStart = requestData.timeRange.start;
            let timeRangeEnd = requestData.timeRange.end;
            let period = requestData.period;
            let area = requestData.area;
            let sensors = [];
            let satellites = [];
            _.each(request.body.sensors, (sensorSatellites, sensorKey) => {
                sensors.push(sensorKey);
                satellites = satellites.concat(sensorSatellites);
            });


            if (isNaN(period)) {
                throw new Error(logger.error("period is not a number"));
            }
            if (!Number.isInteger(period)) {
                throw new Error(logger.error("period is not an integer"));
            }
            if (period <= 0) {
                throw new Error(logger.error("period is 0 or negative"));
            }

            let compositeDates = SnowPortalComposite.getCompositeDates(timeRangeStart, timeRangeEnd, period);
            let compositeStats = [];
            _.each(compositeDates, compositeDate => {
                let composite = new SnowPortalComposite(this._pgPool, this._pgLongRunningPool, compositeDate, null, period, sensors, satellites, this._area);
                compositeStats.push(composite.getStatsForArea(area));
            });

            return Promise.all(compositeStats);

        }).then(data => {
            let dataWithoutNulls = _.compact(data);

            logger.info(`SnowPortal#getComposites ------ get process data resolved!`);
            console.log('data: ', dataWithoutNulls);

            processes[requestHash].ended = Date.now();
            processes[requestHash].data = dataWithoutNulls;
        }).catch(error => {
            logger.error(`SnowPortal#getComposites ------ get process data FAILED: ${error.message || error}`);
            processes[requestHash].ended = Date.now();
            processes[requestHash].error = error;
        });

        response.send({
            ticket: requestHash,
            success: true
        });
    }

    /**
     * API endpoint. Return scope options based on existing data
     * @param request
     * @param response
     */
    getScopeOptions(request, response) {
        let options = {};

        this._pgPool.pool().query(`SELECT DISTINCT "NAME" as name, "KEY" as key FROM areas ORDER BY "NAME"`).then(rows => {
            if (!rows.rows) {
                throw new Error(logger.error("Unable to get areas from database..."));
            }
            options.areas = _.map(rows.rows, row => {
                return {
                    key: row.key,
                    name: row.name
                }
            });
            return this._pgPool.pool().query(`
                SELECT DISTINCT ON (m.source_id)
                    m.source_id,
                    MAX(s.satellite) AS satellite,
                    MAX(s.satellite_key) AS satellite_key,
                    MAX(s.sensor) AS sensor,
                    MAX(s.sensor_key) AS sensor_key,
                    MIN(date)::varchar AS from,
                    MAX(date)::varchar AS to
                FROM metadata AS m
                    JOIN source AS s ON (m.source_id=s.id)
                GROUP BY m.source_id;`);
        }).then(rows => {
            if (!rows.rows) {
                throw new Error(logger.error("Unable to get satellites and sensors from database..."));
            }
            let sensors = [];
            _.each(rows.rows, row => {
                let sensor = _.find(sensors, {key: row.sensor_key});
                if (!sensor) {
                    sensor = {
                        key: row.sensor_key,
                        name: row.sensor,
                        satellites: []
                    };
                    sensors.push(sensor);
                }
                let satellite = _.find(sensor.satellites, {key: row.satellite_key});
                if (!satellite) {
                    sensor.satellites.push({
                        key: row.satellite_key,
                        name: row.satellite,
                        from: row.from,
                        to: row.to,
                    });
                }
            });
            options.sensors = sensors;
        }).then(() => {
            response.send({
                "data": options,
                "success": "true"
            });
        }).catch(error => {
            response.send({
                message: error.message,
                success: false
            });
        });
    }

    convertArrayToSqlAny(array) {
        return "ANY (ARRAY [" + array.map(function (value) {
                return '\'' + value + '\'';
            }).join(",") + "] :: VARCHAR [])";
    }

    convertArrayToSqlArray(array) {
        return "ARRAY [" + array.map(function (value) {
                return '\'' + value + '\'';
            }).join(",") + "]";
    }

    /**
     * Create SQL query for selecting already coumputed statistics for combinations of scenes and areas
     * @param areaString
     * @param sensors
     * @param satellites
     * @param dateStart
     * @param dateEnd
     * @returns {string} SQL query
     */
    findExistingSceneStatsSql(areaString, sensors, satellites, dateStart, dateEnd) {
        let satellitesSql = satellites && satellites.length ? `s.satellite_key = ${this.convertArrayToSqlAny(satellites)}` : ``;
        let sensorsSql = sensors && sensors.length ? `s.sensor_key = ${this.convertArrayToSqlAny(sensors)}` : ``;
        return `
            SELECT
                scene_id,
                aoi_coverage,
                class_distribution,
                date,
                satellite_key,
                sensor_key
              FROM scene_statistics ss
                INNER JOIN metadata m ON ss.scene_id = m.id
                INNER JOIN source AS s ON s.id = m.source_id
              WHERE
                ${satellitesSql} ${satellitesSql ? "AND" : ""} ${sensorsSql} 
                ${satellitesSql || sensorsSql ? "AND" : ""} m.date BETWEEN '${dateStart}' AND '${dateEnd}'
                AND ss.area = '${areaString}';
        `;
    }

    /**
     * Create SQL query for computing scene statistics
     * @param areaType
     * @param area
     * @param sensors
     * @param satellites
     * @param dateStart
     * @param dateEnd
     * @returns {*}
     */
    getScenesDataSql(areaType, area, sensors, satellites, dateStart, dateEnd) {
        let geometryTable;
        let geometryTableCondition;
        switch (areaType) {
            case "key":
                geometryTable = "areas";
                geometryTableCondition = `g."KEY" = '${area}'`;
                break;
            case "noLimit":
                geometryTable = "europe";
                geometryTableCondition = `g.the_geom IS NOT NULL`;
                break;
            default:
                return null;
        }

        let satellitesSql = satellites && satellites.length ? `s.satellite_key = ${this.convertArrayToSqlAny(satellites)}` : ``;
        let sensorsSql = sensors && sensors.length ? `s.sensor_key = ${this.convertArrayToSqlAny(sensors)}` : ``;

        return `
        WITH scenes AS (SELECT
                            m.id,
                            m.filename,
                            m.date,
                            m.source_id,
                            s.satellite_key,
                            s.sensor_key,
                            g.the_geom,
                            100 * (st_area(st_intersection(m.cxhull :: GEOMETRY, g.the_geom)) /
                            st_area(g.the_geom)) AS aoi_coverage
                        FROM rasters AS r
                            INNER JOIN metadata AS m ON m.id = r.metadata_id
                            INNER JOIN source AS s ON s.id = m.source_id
                            INNER JOIN ${geometryTable} AS g ON ${geometryTableCondition}
                        WHERE ${satellitesSql} ${satellitesSql ? "AND" : ""} ${sensorsSql} 
                            ${satellitesSql || sensorsSql ? "AND" : ""} m.date BETWEEN '${dateStart}' AND '${dateEnd}'
                            AND m.id NOT IN (SELECT scene_id FROM scene_statistics WHERE area = '${area}')
                            AND r.extent && g.the_geom
                            AND st_intersects(st_setsrid(r.extent, 3035), g.the_geom)
                        GROUP BY
                            m.id,
                            m.filename,
                            m.date,
                            m.source_id,
                            s.satellite_key,
                            s.sensor_key,
                            m.cxhull,
                            g.the_geom)
    
        SELECT
            l.classified_as  AS class,
            sum((pvc).count) AS count,
            foo.coverage     AS coverage,
            foo.key          AS key,
            foo.satellite    AS satellite,
            foo.sensor       AS sensor,
            foo.date              AS date
        FROM (SELECT
                    st_valuecount(st_clip(t.rast, s2.the_geom)) AS pvc,
                    s2.source_id          AS source,
                    s2.satellite_key      AS satellite,
                    s2.sensor_key         AS sensor,
                    s2.aoi_coverage       AS coverage,
                    m2.id                 AS key,
                    m2.date :: VARCHAR    AS date
                FROM tile AS t
                    INNER JOIN scenes AS s2 ON s2.filename = t.filename
                    INNER JOIN metadata AS m2 ON m2.filename = t.filename
                WHERE s2.aoi_coverage > 0) AS foo
            INNER JOIN legend AS l ON l.source_id = foo.source AND (foo.pvc).value BETWEEN l.value_from AND l.value_to
        GROUP BY class, coverage, key, satellite, sensor, date;`;
    }

    /**
     * Create SQL query for saving computed scene stats
     * @param newScenesData
     * @param area
     * @returns {string}
     */
    saveSceneStatsSql(newScenesData, area) {
        let sqlInserts = [];
        _.each(newScenesData, newScene => {
            sqlInserts.push(`INSERT INTO scene_statistics (
                                    scene_id,
                                    area,
                                    aoi_coverage,
                                    class_distribution)
                                VALUES (
                                    ${newScene.key},
                                    '${area}',
                                    ${newScene.aoiCoverage},
                                    '${JSON.stringify(newScene.classDistribution)}'
                                );`);
        });
        return sqlInserts.join("\n");
    }

    /**
     * Create scene and composite metadata/statistics tables if they don't exist.
     */
    initTables() {
        return this._pgPool.query(`CREATE SCHEMA IF NOT EXISTS composites;`).then(() => {
            return this._pgPool.query(`CREATE TABLE IF NOT EXISTS composites.metadata (
                                                    key varchar(50) not null,
                                                    sensors text[] not null,
                                                    satellites text[],
                                                    date_start date not null,
                                                    date_end date not null,
                                                    area varchar(40) not null,
                                                    used_scenes text[],
                                                    period integer);
                                       CREATE TABLE IF NOT EXISTS composites.statistics (
                                                    composite_key varchar(50) not null,
                                                    area varchar(40) not null,
                                                    aoi_coverage double precision not null,
                                                    class_distribution varchar(255) not null);
                                       CREATE TABLE IF NOT EXISTS scene_statistics (
                                                    scene_id integer not null,
                                                    area varchar(40) not null,
                                                    aoi_coverage double precision not null,
                                                    class_distribution varchar(255) not null);`);
        });
    }
}


module.exports = SnowPortal;