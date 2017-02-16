let _ = require("lodash");
let Promise = require("promise");

class SnowPortal {
    constructor(app, pool) {
        this._pgPool = pool;

        app.get("/api/snowportal/scopeoptions", this.getScopeOptions.bind(this));
        app.post("/api/snowportal/scenes", this.getScenesByScope.bind(this));
    }

    getScenesByScope(request, response) {
        let scope = request.body;
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
            return Promise.all(queries);
        }).then(data => {
            response.send({
                data: data,
                success: true
            });
        }).catch(error => {
            response.send({
                message: error.message,
                success: false
            });
        });
    }

    getScopeOptions(request, response) {
        let options = {};

        this._pgPool.pool().query(`SELECT DISTINCT "NAME" as name, "KEY" as key FROM areas`).then(rows => {
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
                        s.satellite,
                        s.sensor,
                        m.date,
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
                        AND m.date BETWEEN '${scope.timeRange.from}' AND '${scope.timeRange.to}'
                        AND ST_Intersects(ST_SetSRID(r.extent::geometry, 3035), a.the_geom)
                    GROUP BY
                        m.id,
                        m.filename,
                        s.satellite,
                        s.sensor,
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
                    FROM (SELECT DISTINCT 
                            ST_ValueCount(ST_Clip(t.rast, a.the_geom)) AS pvc 
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
                        legend AS l ON (l.value=(pvc).value)
                    JOIN 
                        source AS s ON (l.source_id=s.id)
                    JOIN 
                        metadata AS m ON (m.source_id=s.id)
                    WHERE 
                        m.id=${scene.id}
                    GROUP BY 
                        l.classified_as;
                `;
                console.log(sql);
                return sql;
            } else {
                throw new Error("Unknown area type...");
            }
        });
    }
}


module.exports = SnowPortal;