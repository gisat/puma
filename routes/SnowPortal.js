let logger = require('../common/Logger').applicationWideLogger;

let _ = require("lodash");
let Promise = require("promise");
let hash = require("object-hash");

let processes = {};

class SnowPortal {
    constructor(app, pool) {
        this._pgPool = pool;
        
        app.get("/api/snowportal/scopeoptions", this.getScopeOptions.bind(this));
        app.post("/api/snowportal/scenes", this.getScenes.bind(this));
        app.post("/api/snowportal/composites", this.getComposites.bind(this));

        app.get("/rest/composites/metadata", this.getCompositesMetadata.bind(this));
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
        let dateStart = request.body.timeRange.start;
        let dateEnd = request.body.timeRange.end;
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
        
        let sql = this.getScenesDataSql(areaType, area, sensors, satellites, dateStart, dateEnd);
        
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
            let dateStart = requestData.timeRange.start;
            let dateEnd = requestData.timeRange.end;
            let sensors = Object.keys(requestData.sensors);
            let period = requestData.period;
            let area = requestData.area;
            
            let getMetadataSql = this.getCompositesMetadataSql(dateStart, dateEnd, period, sensors);
            
            return this._pgPool.pool().query(getMetadataSql).then(result => {
                let promises = [];
                if (!result.rows.length) {
                    throw new Error("no results were found");
                    // TODO



                } else {
                    _.each(result.rows, row => {
                        let tableName = row.key;
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
                                    dateFrom: row.date_start,
                                    period: period,
                                    sensors: sensors,
                                    aoiCoverage: 100,
                                    classDistribution: classDistribution
                                })
                            }).catch(error => {
                                reject(error);
                            });
                        }));
                    });
                    return Promise.all(promises);
                }
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
    
    getCompositesMetadataSql(dateStart, dateEnd, period, sensors) {
        return `
            SELECT
                m.key,
                m.date_start :: VARCHAR
            FROM composites.metadata AS m
            WHERE m.period = ${period}
                  AND m.sensors <@ ${this.convertArrayToSqlArray(sensors)}
                  AND m.sensors @> ${this.convertArrayToSqlArray(sensors)}
                  AND (('${dateStart}', '${dateEnd}') OVERLAPS (m.date_start, m.date_end) 
                        OR m.date_start BETWEEN '${dateStart}' AND '${dateEnd}' 
                        OR m.date_end BETWEEN '${dateStart}' AND '${dateEnd}');`
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
        GROUP BY class, coverage, key, satellite, sensor, date;`;
    }
}


module.exports = SnowPortal;