let _ = require("lodash");

class SnowPortal {
    constructor(app, pool) {
        this._pgPool = pool;

        app.get("/api/snowportal/scopeoptions", this.getScopeOptions.bind(this));
    }

    getScopeOptions(request, response) {
        let options = {};

        this._pgPool.pool().query(`SELECT DISTINCT "NAME" as name FROM areas`).then(rows => {
            if (!rows.rows) {
                throw new Error("Unable to get areas from database...");
            }
            options.areas = _.map(rows.rows, row => {
                return {
                    key: row.name.toLowerCase().replace(/ /g, '-'),
                    name: row.name
                }
            });
            return this._pgPool.pool().query(`SELECT MIN(date)::varchar AS from, MAX(date)::varchar AS to FROM metadata`);
        }).then(rows => {
            if (!rows.rows) {
                throw new Error("Unable to get time from database...");
            }
            options.time = rows.rows;
            return this._pgPool.pool().query(`select distinct m.source_id, s.satellite, s.satelliteKey, s.sensor, s.sensorKey from metadata as m join source as s on (m.source_id=s.id);`)
        }).then(rows => {
            if (!rows.rows) {
                throw new Error("Unable to get satellites and sensors from database...");
            }
            let sensors = [];
            _.each(rows.rows, row => {
                let sensor = _.find(sensors, {key: row.sensorKey});
                if (!sensor) {
                    sensor = {
                        key: row.sensorKey,
                        name: row.sensor,
                        satellites: []
                    };
                    sensors.push(sensor);
                }
                let satellite = _.find(sensor.satellites, {key: row.satelliteKey});
                if (!satellite) {
                    sensor.satellites.push({
                        key: row.satelliteKey,
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
                message: error,
                success: false
            });
        });
    }
}

module.exports = SnowPortal;