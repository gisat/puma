let logger = require('../common/Logger').applicationWideLogger;

let _ = require("lodash");
let Promise = require("promise");
let hash = require("object-hash");
var child_process  = require('pn/child_process');

let processes = {};

class SnowPortal {
    constructor(app, pool) {
        this._pgPool = pool;
        
        app.get("/api/snowportal/scopeoptions", this.getScopeOptions.bind(this));
        app.post("/api/snowportal/scenes", this.getScenes.bind(this));
        app.post("/api/snowportal/composites", this.getComposites.bind(this));

        app.get("/rest/composites/metadata", this.getCompositesMetadata.bind(this));

        this.area = 'europe'; // TODO set dynamicaly?
        this.tmpTiffLocation = "/tmp/";
        this.geoNodeManagePyDir = '/home/geonode/geonode';
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
            let scenes = {};
            
            _.each(results.rows, row => {
                let scene = scenes[row.key] || {};
                let classDistribution = scene.classDistribution || {};
                
                scene.key = row.key;
                scene.satellite = row.satellite;
                scene.sensor = row.sensor;
                scene.date = row.date;
                scene.aoiCoverage = row.coverage;
    
                classDistribution[row.class] = row.count;
    
                let total = Number(totals[scene.key]) || 0;
                total += Number(row.count);
                totals[scene.key] = total;
                
                scene.classDistribution = classDistribution;
                
                scenes[row.key] = scene;
            });
            
            _.each(scenes, scene => {
                _.each(scene.classDistribution, (value, key) => {
                    scene.classDistribution[key] = 100 * (Number(value) / Number(totals[scene.key]));
                });
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

        // TODO temporary
        if (requestData.period == 'week') {
            requestData.period = 7;
        }
        if (requestData.period == 'day') {
            requestData.period = 1;
        }

        let requestHash = hash(requestData);

        /**
         * existing process, return ticket or data
         */

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
            let sensors = Object.keys(requestData.sensors);
            let period = requestData.period;
            let area = requestData.area;

            if (isNaN(period)) {
                throw new Error("period is not a number");
            }
            if (!Number.isInteger(period)) {
                throw new Error("period is not an integer");
            }
            if (period <= 0) {
                throw new Error("period is 0 or negative");
            }

            let compositeDates = this.getCompositeDates(timeRangeStart, timeRangeEnd, period);
            let getMetadataSql = this.getCompositesMetadataSql(compositeDates, period, sensors);

            return this._pgPool.pool().query(getMetadataSql).then(result => {
                /**
                 * Get metadata of ready composites or newly created composites
                 */

                let promises = [];

                _.each(compositeDates, compositeDate => {
                    // find composite in metadata PG result
                    let composite = _.find(result.rows, function(item){
                        return item['date_start'] == compositeDate;
                    });

                    if (composite) { // composite exists
                        promises.push(composite);
                    } else { // composite doesn't exist
                        promises.push(this.createComposite(compositeDate, period, sensors));
                    }
                });

                return Promise.all(promises);

            }).then(compositesMetadata => {
                /**
                 * Get composites data and compute statistics
                 */

                let promises = [];

                _.each(compositesMetadata, composite => {

                    let tableName = composite.key;
                    promises.push(new Promise((resolve, reject) => {
                        let sql = this.getCompositeDataSql(tableName, area.type, area.value, sensors);
                        let query = this._pgPool.pool().query(sql).then((results) => {
                            let classDistribution = {};
                            let total = 0;
                            _.each(results.rows, row => {
                                classDistribution[row.class] = row.count;
                                total += Number(row.count);
                            });
                            _.each(results.rows, row => {
                                classDistribution[row.class] = (row.count / total) * 100;
                            });
                            resolve({
                                key: tableName,
                                dateFrom: composite.date_start,
                                period: period,
                                sensors: sensors,
                                aoiCoverage: 100,
                                classDistribution: classDistribution
                            })
                        }).catch(error => {
                            logger.error(`Composites Statistics Error: ${error} | ${sql}`);
                            reject(new Error(`Composites Statistics Error: ${error.message} | ${sql}`));
                        });
                    }));

                });

                return Promise.all(promises);

            }).catch(error => {
                throw error;
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

    createComposite(startDay, period, sensors) {
        let usedScenes = [];
        let area = this.area;
        let tableName;
        let endDay = this.addDays(startDay, period - 1).toISOString().split("T")[0];

        return new Promise((resolve, reject) => {
            /**
             * get IDs of scenes
             */

            let sql = this.getScenesIDsSql(startDay, endDay, sensors);
            let query = this._pgPool.pool().query(sql).then((results) => {
                _.each(results.rows, scene => {
                    usedScenes.push(scene.id);
                });

                if (!usedScenes.length) {
                    reject(new Error(`No scenes for sensors [${sensors}] from ${startDay} to ${endDay}.`));
                }

                resolve(usedScenes);
            }).catch(error => {
                logger.error(`Creating composite, get IDs Error: ${error}`);
                reject(new Error(`Creating composite, get IDs Error: ${error.message} | ${error}`));
            });

        }).then(() => {
            /**
             * Generate composite
             */
            return new Promise((resolve, reject) => {
                tableName = "composite_" + hash({
                        startDay: startDay,
                        endDay: endDay,
                        period: period,
                        sensors: sensors,
                        area: area,
                        usedScenes: usedScenes
                    });
                let sql = this.createCompositeSql(tableName, startDay, endDay, sensors);
                logger.trace(`SnowPortal#createComposite: Generating composite from ${startDay} to ${endDay} (${period} days) ` +
                    `for sensors ${sensors} in area ${area} from scenes ${usedScenes}
                | tableName: ${tableName}
                | SQL: ${sql}`);
                let query = this._pgPool.pool().query(sql).then((result) => {
                    resolve();
                }).catch(error => {
                    logger.error(`Creating composite, generating Error: ${error}`);
                    reject(new Error(`Creating composite, generating Error: ${error.message} | ${error}`));
                });
            });
        }).then(() => {
            /**
             * Save composite metadata
             */
            return new Promise((resolve, reject) => {
                let sql = this.saveCompositeMetadataSql(tableName, startDay, endDay, period, sensors, area, usedScenes);
                logger.trace(`SnowPortal#createComposite: Saving composite metadata | SQL: ${sql}`);
                let query = this._pgPool.pool().query(sql).then((result) => {
                    resolve();
                }).catch(error => {
                    logger.error(`Creating composite, saving metadata Error: ${error}`);
                    reject(new Error(`Creating composite, saving metadata Error: ${error.message} | ${error}`));
                });
            });
        }).then(() => {
            /**
             * Export composite to GeoTiff
             * TODO for Windows?
             */
            return new Promise((resolve, reject) => {
                let command = `gdal_translate "PG:host=localhost port=5432 dbname=geonode_data user=geonode password=geonode schema=composites table=${tableName} mode=2" ${this.tmpTiffLocation}${tableName}.tif`;
                logger.trace(`SnowPortal#createComposite: Exporting GeoTiff of the composite ${tableName}`);
                resolve(child_process.exec(command).promise);
            });
        }).then(() => {
            /**
             * Import GeoTiff to Geoserver
             * TODO for Windows?
             */
            return new Promise((resolve, reject) => {
                let command = `curl -u admin:geoserver -XPUT -H "Content-type:image/tiff" --data-binary @${this.tmpTiffLocation}${tableName}.tif http://localhost/geoserver/rest/workspaces/geonode/coveragestores/${tableName}/file.geotiff`;
                logger.trace(`SnowPortal#createComposite: Importing GeoTiff in Geoserver (${tableName})`);
                resolve(child_process.exec(command).promise);
            });
        }).then(() => {
            /**
             * Publish GeoTiff in GeoNode
             * TODO for Windows?
             */
            return new Promise((resolve, reject) => {
                let command = `cd ${this.geoNodeManagePyDir} && python manage.py updatelayers -f ${tableName}`;
                logger.trace(`SnowPortal#createComposite: Publishing Geoserver raster layer in GeoNode (${tableName})`);
                resolve(child_process.exec(command).promise);
            });
        }).then(() => {
            /**
             * Delete GeoTiff
             * TODO for Windows?
             */
            return new Promise((resolve, reject) => {
                logger.trace(`SnowPortal#createComposite: Deleting GeoTiff file ${tableName}.tif`);
                child_process.exec(`rm ${this.tmpTiffLocation}${tableName}.tif`).promise.then(() => {
                    resolve({
                        date_start: startDay,
                        key: tableName
                    });
                });
            });
        }).catch(error => {
            logger.error(`SnowPortal#createComposite: Error ${error.message}`);
            throw error;
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
                throw new Error("Unable to get areas from database...");
            }
            options.areas = _.map(rows.rows, row => {
                return {
                    key: row.key,
                    name: row.name
                }
            });
            return this._pgPool.pool().query(`SELECT MIN(date)::varchar AS from, MAX(date)::varchar AS to FROM metadata`);
        }).then(rows => {
            if (!rows.rows) {
                throw new Error("Unable to get time from database...");
            }
            options.time = rows.rows[0];
            return this._pgPool.pool().query(`select distinct m.source_id, s.satellite, s.satellite_key, s.sensor, s.sensor_key from metadata as m join source as s on (m.source_id=s.id);`)
        }).then(rows => {
            if (!rows.rows) {
                throw new Error("Unable to get satellites and sensors from database...");
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
                        name: row.satellite
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
    * Generate array of SQL string dates for composites - based on time range and period.
    * @param timeRangeStart
    * @param timeRangeEnd
    * @param period
    * @returns {Array} Array of SQL date strings
    */
    getCompositeDates(timeRangeStart, timeRangeEnd, period) {
        // create dates - array with SQL dates, begginings of composite periods
        let dates = [];
        let dateObj = new Date(timeRangeStart);
        let timeRangeEndObj = new Date(timeRangeEnd);
        let endDate;
        while((endDate = this.addDays(dateObj, period - 1)) <= timeRangeEndObj){
            dates.push(dateObj.toISOString().split('T')[0]);
            dateObj = this.addDays(endDate, 1);
        }
        return dates;
    }

    /**
     * Create SQL query for selecting composites metadata.
     * @param compositeDates Array of composite start days (SQL string format)
     * @param period
     * @param sensors
     * @returns {string} SQL query string
     */
    getCompositesMetadataSql(compositeDates, period, sensors) {
        return `
            SELECT
                m.key,
                m.date_start :: VARCHAR
            FROM composites.metadata AS m
            WHERE m.period = ${period}
                  AND m.sensors <@ ${this.convertArrayToSqlArray(sensors)}
                  AND m.sensors @> ${this.convertArrayToSqlArray(sensors)}
                  AND m.date_start::VARCHAR = ANY(${this.convertArrayToSqlArray(compositeDates)});`;
    }

    /**
     * Create SQL query for selecting Scene IDs for composite creation
     * @param startDate
     * @param endDate
     * @param sensors
     * @returns {string}
     */
    getScenesIDsSql(startDate, endDate, sensors) {
        return `
            SELECT
                m.id, *
            FROM
                metadata AS m
                INNER JOIN source AS s ON (m.source_id = s.id)
            WHERE
                s.sensor_key = ANY(${this.convertArrayToSqlArray(sensors)})
                AND m.date BETWEEN '${startDate}' AND '${endDate}';`;
    }

    /**
     * Create SQL query for creating composites
     * @param tableName
     * @param startDate
     * @param endDate
     * @param sensors
     * @returns {string}
     */
    createCompositeSql(tableName, startDate, endDate, sensors) {
        return `
            CREATE TABLE composites.${tableName}
                AS SELECT st_union(t.rast, 1, 'MAX') as rast
                    FROM (SELECT DISTINCT st_centroid(extent) AS centroid
                    FROM rasters) AS foo,
                        tile AS t
                    INNER JOIN rasters AS r ON (r.rid = t.rid)
                    INNER JOIN metadata AS m ON (m.id = r.metadata_id)
                    INNER JOIN source AS s ON (s.id = m.source_id)
                    WHERE r.extent && foo.centroid
                        AND m.date BETWEEN '${startDate}' AND '${endDate}'
                        AND s.sensor_key = ${this.convertArrayToSqlAny(sensors)}
                    GROUP BY foo.centroid;`;
    }

    saveCompositeMetadataSql(tableName, startDate, endDate, period, sensors, area, usedScenes) {
        return `
            INSERT INTO composites.metadata
                (key, sensors, date_start, date_end, period, area, used_scenes)
                VALUES ('${tableName}', ${this.convertArrayToSqlArray(sensors)}, '${startDate}', '${endDate}', ${period}, '${area}', ${this.convertArrayToSqlArray(usedScenes)});`;
    }

    /**
     * Add n days to date and return Date instance
     * @param date Date instance or date in string
     * @param days Number of days to add, can be negative
     * @returns {Date}
     */
    addDays(date, days){
        var result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    
    getCompositeDataSql(tableName, areaType, area, sensors) {
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
            l.classified_as      AS class,
            sum((foo.pvc).count) AS count
        FROM (SELECT ST_ValueCount(ST_Clip(c.rast, g.the_geom)) AS pvc
                FROM composites."${tableName}" AS c
                    JOIN ${geometryTable} AS g ON (${geometryTableCondition})) AS foo
            JOIN source AS s ON (s.sensor_key = ${this.convertArrayToSqlAny(sensors)})
            JOIN legend AS l ON (l.source_id = s.id AND (foo.pvc).value BETWEEN l.value_from AND l.value_to)
        WHERE l.classified_as <> 'ND'
            AND l.classified_as <> 'O'
            AND l.classified_as <> 'N'
        GROUP BY class;`;
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
            WHERE l.classified_as <> 'ND'
                AND l.classified_as <> 'O'
                AND l.classified_as <> 'N'
        GROUP BY class, coverage, key, satellite, sensor, date;`;
    }
}


module.exports = SnowPortal;