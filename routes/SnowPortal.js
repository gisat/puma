let _ = require("lodash");
let Promise = require("promise");
let hash = require("object-hash");

let processes = {};

class SnowPortal {
    constructor(app, pool) {
        this._pgPool = pool;
        
        app.get("/api/snowportal/scopeoptions", this.getScopeOptions.bind(this));
        app.post("/api/snowportal/scenes", this.getScenesByScope.bind(this));
        app.post("/api/snowportal/composites", this.getComposites.bind(this));
    }
    
    getComposites(request, response) {
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
        
        Promise.resolve().then(() => {
            let dateFrom = new Date(requestData.timeRange.start);
            let dateTo = new Date(requestData.timeRange.end);
            let sensors = Object.keys(requestData.sensors);
            let period = requestData.period;
            let area = requestData.area.value;
            
            let sql = "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'composite_europe_%'";
            
            return this._pgPool.pool().query(sql).then(result => {
                let promises = [];
                
                _.each(result.rows, row => {
                    let table_name = row.table_name;
                    let table_date_str = table_name.replace("composite_europe_", "");
                    table_date_str = table_date_str.replace(/_/g, "-");
                    let table_date = new Date(table_date_str);
                    
                    if (table_date >= dateFrom && table_date <= dateTo) {
                        promises.push(new Promise((resolve, reject) => {
                            let sql = `SELECT
                                    l.classified_as AS class,
                                    sum((foo.pvc).count) AS count
                                FROM (SELECT ST_ValueCount(ST_Clip(c.rast, a.the_geom)) AS pvc
                                FROM ${table_name} AS c
                                JOIN areas AS a ON (a."KEY" = '${area}')) AS foo
                                JOIN source AS s ON (s.sensor_key='modis')
                                JOIN legend AS l ON (l.source_id=s.id AND (foo.pvc).value BETWEEN l.value_from AND l.value_to)
                                GROUP BY class;`;
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
                                    key: table_name,
                                    dateFrom: table_date.toISOString(),
                                    period: period,
                                    sensors: sensors,
                                    aoiCoverage: 100,
                                    classDistribution: classDistribution
                                })
                            }).catch(error => {
                                reject(error);
                            });
                        }));
                    }
                });
                return Promise.all(promises);
            });
        }).then(data => {
            processes[requestHash].ended = Date.now();
            processes[requestHash].data = data;
        }).catch(error => {
            processes[requestHash].ended = Date.now();
            processes[requestHash].error = error;
        });
        
        response.send({
            ticket: requestHash,
            success: true
        });
    }
    
    getScenesByScope(request, response) {
        let scope = request.body;
        let scopeHash = hash(scope);
        
        if (processes[scopeHash]) {
            let responseObject = {};
            if (processes[scopeHash].data) {
                responseObject.data = processes[scopeHash].data;
                responseObject.success = true;
            } else if (processes[scopeHash].error) {
                responseObject.message = processes[scopeHash].error;
                responseObject.success = false;
            } else {
                responseObject.ticket = scopeHash;
                responseObject.success = true;
            }
            response.send(responseObject);
            return;
        } else {
            processes[scopeHash] = {
                started: Date.now(),
                ended: null,
                scope: scope,
                data: null,
                error: null
            };
        }
        
        this.getScenesSqlByScope(
            scope
        ).then(sql => {
            return this._pgPool.pool().query(sql);
        }).then(rows => {
            if (!rows.rows || !rows.rows.length) {
                throw new Error("Unable to get data for given scope...");
            }
            let queries = [];
            _.each(rows.rows, row => {
                queries.push(
                    this.getScenesDataSqlBySceneAndScope(row, scope).then(sql => {
                        return this._pgPool.pool().query(sql)
                    })
                );
            });
            return Promise.all(queries).then(results => {
                return _.map(rows.rows, (row, index) => {
                    let classDistribution = {};
                    let total = 0;
                    _.each(results[index].rows, row => {
                        total += Number(row.count);
                    });
                    _.each(results[index].rows, row => {
                        classDistribution[row.pixel] = (Number(row.count) / total) * 100;
                    });
                    return {
                        key: row.id,
                        date: row.date,
                        sensor: row.sensor_key,
                        satellite: row.satellite_key,
                        aoiCoverage: row.perct,
                        classDistribution: classDistribution
                    }
                });
            });
        }).then(data => {
            processes[scopeHash].ended = Date.now();
            processes[scopeHash].data = data;
        }).catch(error => {
            processes[scopeHash].ended = Date.now();
            processes[scopeHash].error = error;
        });
        
        response.send({
            ticket: scopeHash,
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
    
    /**
     * Build PGSQL query based on given scope
     * @param scope
     */
    getScenesSqlByScope(scope) {
        return Promise.resolve().then(() => {
            if (scope.area.type === "polygon") {
                return `polygon`;
            } else if (scope.area.type === "key") {
                let sensors = [];
                let satellites = [];
                _.each(scope.sensors, (sensorSats, sensorKey) => {
                    sensors.push(sensorKey);
                    satellites = _.concat(satellites, sensorSats);
                });
                
                satellites = satellites.map(sattelite => {
                    return `'${sattelite}'`
                }).join(",");
                
                sensors = sensors.map(sensor => {
                    return `'${sensor}'`
                }).join(",");
                
                return (`
                    SELECT 
                        m.id,
                        m.filename,
                        s.satellite_key,
                        s.sensor_key,
                        m.date::varchar,
                        100 * ST_Area(ST_Intersection(m.cxhull, a.the_geom)) / ST_Area(a.the_geom) AS perct
                    FROM
                        tile AS t
                        JOIN rasters AS r ON (t.rid = r.rid)
                        JOIN metadata AS m ON (r.metadata_id = m.id)
                        JOIN source AS s ON (s.id = m.source_id)
                        JOIN areas AS a ON (a."KEY" = '${scope.area.value}')
                    WHERE
                        s.satellite_key IN (${satellites})
                        AND s.sensor_key IN (${sensors})
                        AND m.date BETWEEN '${scope.timeRange.start}' AND '${scope.timeRange.end}'
                        AND ST_Intersects(ST_SetSRID(r.extent::geometry, 3035), a.the_geom)
                    GROUP BY
                        m.id,
                        m.filename,
                        s.satellite_key,
                        s.sensor_key,
                        m.date,
                        m.cxhull,
                        a.the_geom
                    ORDER BY
                        m.date
                `);
            } else {
                throw new Error("Unknown area type...");
            }
        });
    }
    
    /**
     * Build PGSQL query based on combination of scope and scenes
     * @param scene
     * @param scope
     */
    getScenesDataSqlBySceneAndScope(scene, scope) {
        return Promise.resolve().then(() => {
            if (scope.area.type === "polygon") {
                return `polygon`;
            } else if (scope.area.type === "key") {
                let sensors = [];
                let satellites = [];
                _.each(scope.sensors, (sensorSats, sensorKey) => {
                    sensors.push(sensorKey);
                    satellites = _.concat(satellites, sensorSats);
                });
                
                satellites = satellites.map(sattelite => {
                    return `'${sattelite}'`
                }).join(",");
                
                sensors = sensors.map(sensor => {
                    return `'${sensor}'`
                }).join(",");
                
                let sql = `
                    SELECT
                        l.classified_as AS pixel,
                        Sum((pvc).count) AS count
                    FROM (SELECT DISTINCT ST_ValueCount(ST_Clip(t.rast, a.the_geom)) AS pvc
                            FROM
                                metadata AS m
                            JOIN
                                rasters AS r ON (m.id=r.metadata_id)
                            JOIN
                                tile AS t ON (r.rid=t.rid)
                            JOIN
                                areas AS a ON (a."KEY" = '${scope.area.value}')
                    WHERE
                        m.id=${scene.id}) AS foo
                    JOIN
                        legend AS l ON ((pvc).value BETWEEN l.value_from AND l.value_to)
                    JOIN
                        source AS s ON (l.source_id=s.id)
                    JOIN
                        metadata AS m ON (m.source_id=s.id)
                    WHERE
                        m.id=${scene.id}
                    GROUP BY
                        l.classified_as;
                `;
                return sql;
            } else {
                throw new Error("Unknown area type...");
            }
        });
    }
}


module.exports = SnowPortal;