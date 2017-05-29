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

        this.area = 'europe'; // TODO set dynamicaly?

        this.visibleClasses = ["S", "NS", "C", "NC"];
    }

    getCompositesMetadata(request, response) {
        this._pgPool.query(`SELECT * FROM composites.metadata ORDER BY date_start`).then(result => {
            response.json({metadata: result.rows});
        }).catch(err => {
            logger.error(`SnowPortal#getCompositeMetadata Error: `, err);
            response.status(500).json({status: "err"});
        });
    }

    getScenes(request, response) {
        let areaType = request.body.area.type;
        let area = request.body.area.value;
        let timeRangeStart = request.body.timeRange.start;
        let timeRangeEnd = request.body.timeRange.end;
        let sensors = [];
        let satellites = [];

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

        let sql = this.getScenesDataSql(areaType, area, sensors, satellites, timeRangeStart, timeRangeEnd);

        this._pgPool.pool().query(sql).then(results => {
            let totals = {};
            let visibleTotals = {};
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

                /**
                 * Classes we want to see in statistics
                 */
                if (this.visibleClasses.includes(row.class)) {
                    classDistribution[row.class] = row.count;
                    visibleTotals[scene.key] = visibleTotals[scene.key] + Number(row.count) || Number(row.count);
                }
                scene.classDistribution = classDistribution;

                scenes[row.key] = scene;
            });

            _.each(scenes, scene => {
                _.each(scene.classDistribution, (value, key) => {
                    scene.classDistribution[key] = 100 * (Number(value) / Number(visibleTotals[scene.key]));
                });
                scene.aoiCoverage *= (visibleTotals[scene.key] / totals[scene.key]) || 0;
            });

            return _.map(scenes, scene => {
                return scene;
            });
        }).then(data => {
            processes[requestHash].ended = Date.now();
            processes[requestHash].data = data;
        }).catch(error => {
            processes[requestHash].ended = Date.now();
            processes[requestHash].error = error.message;
        });

        response.send({
            ticket: requestHash,
            success: true
        });
    }


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
            let compositesMetadata = [];
            _.each(compositeDates, compositeDate => {
                let composite = new SnowPortalComposite(this._pgPool, this._pgLongRunningPool, compositeDate, null, period, sensors, satellites, this.area);
                compositesMetadata.push(composite.getMetadata());
            });

            return Promise.all(compositesMetadata).then(metadata => {
                /**
                 * Get composites data and compute statistics
                 * TODO - this can be moved to the SnowPortalComposite class
                 */

                let promises = [];

                _.each(metadata, composite => {

                    if(composite === null) {
                        logger.info(`SnowPortal#getComposites Empty composite metadata object.`);
                        return;
                    }

                    let tableName = composite.key;
                    promises.push(new Promise((resolve, reject) => {
                        let sql = this.getCompositeDataSql(tableName, area.type, area.value, sensors, satellites);
                        this._pgPool.pool().query(sql).then((results) => {
                            let classDistribution = {};
                            let total = 0;
                            let visibleTotal = 0;
                            let aoiCoverage = 0;
                            _.each(results.rows, row => {

                                /**
                                 * For classes we want to see in statistics
                                 */
                                if (this.visibleClasses.includes(row.class)) {
                                    visibleTotal += Number(row.count);
                                    classDistribution[row.class] = null;
                                    aoiCoverage = row.aoi;
                                }

                                total += Number(row.count);

                            });
                            _.each(results.rows, row => {
                                if (this.visibleClasses.includes(row.class)) {
                                    classDistribution[row.class] = (row.count / visibleTotal) * 100;
                                }
                            });

                            let dataToResolve = {
                                key: tableName,
                                dateFrom: composite.date_start,
                                period: period,
                                sensors: sensors,
                                satellites: satellites,
                                aoiCoverage: aoiCoverage * (visibleTotal / total),
                                classDistribution: classDistribution
                            };

                            resolve(dataToResolve);
                        }).catch(error => {
                            reject(new Error(logger.error(`SnowPortal#getComposites ------ Composites Statistics Error: ${error.message} | ${error}`)));
                        });
                    }));

                });

                return Promise.all(promises);

            }).catch(error => {
                logger.error(`SnowPortal#getComposites ------ Error while getting metadata about composites: ${error}`);
                throw error;
            });
        }).then(data => {
            logger.info(`SnowPortal#getComposites ------ get process data resolved!`);
            console.log('data: ', data);

            processes[requestHash].ended = Date.now();
            processes[requestHash].data = data;
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
     * Return scope options based on existing data
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

    getCompositeDataSql(tableName, areaType, area, sensors, satellites) {
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

        return `
        SELECT
          l.classified_as AS class,
          sum(foo.count)  AS count,
          max(foo.aoi)    AS aoi
        FROM (
            SELECT
              (clipped_raster_data.pvc).value                          AS class,
              sum((clipped_raster_data.pvc).count)               AS count,
              avg(aoi.aoi) AS aoi
            FROM
              (SELECT st_valuecount(st_clip(composite.rast, g.the_geom)) AS pvc
               FROM composites."${tableName}" AS composite INNER JOIN ${geometryTable} AS g
                   ON ${geometryTableCondition} AND st_intersects(g.the_geom, composite.rast)) AS clipped_raster_data,
              (SELECT 100 * (st_area(st_union(st_intersection(st_polygon(st_clip(r.rast, g.the_geom)), g.the_geom))) /
                       st_area(st_union(g.the_geom))) AS aoi
                 FROM composites."${tableName}" AS r
                   INNER JOIN ${geometryTable} AS g ON ${geometryTableCondition}
                 WHERE st_intersects(r.rast, g.the_geom)) AS aoi
            GROUP BY class) AS foo
          INNER JOIN source AS s ON s.satellite_key = ${this.convertArrayToSqlAny(satellites)} AND s.sensor_key = ${this.convertArrayToSqlAny(sensors)}
          INNER JOIN legend AS l ON l.source_id = s.id AND foo.class BETWEEN l.value_from AND l.value_to
        GROUP BY l.classified_as;
        `
    }

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
                            AND r.extent && g.the_geom
                            AND st_intersects(st_setsrid(r.extent, 3035), g.the_geom)
                        GROUP BY
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
                                                    period integer);`);
        });
    }
}


module.exports = SnowPortal;