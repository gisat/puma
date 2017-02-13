let _ = require("lodash");

class SnowPortal {
    constructor(app, pool) {
        this._pgPool = pool;

        app.get("/api/snowportal/scopeoptions", this.getScopeOptions.bind(this));
    }

    getScopeOptions(request, response) {
        let options = {
            "areas": [
                {
                    "key": "germany",
                    "name": "Germany"
                }
            ],
            "time": {
                "from": "2015-01-01",
                "to": "2016-01-01"
            },
            "sensors": [
                {
                    "key": "modis",
                    "name": "Modis",
                    "satellites": [
                        {
                            "key": "terra",
                            "name": "Terra"
                        }
                    ]
                }
            ]
        };

        this._pgPool.pool().query(`SELECT DISTINCT "NAME" as name FROM areas`).then(rows => {
            if(!rows.rows) {
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
            if(!rows.rows) {
                throw new Error("Unable to get time from database...");
            }
            options.time = rows.rows;
            return this._pgPool.pool().query(`SELECT DISTINCT satellite, sensor FROM source`);
        }).then(rows => {
            if(!rows.rows) {
                throw new Error("Unable to get satellites and sensors from database...");
            }
            let sensors = [];
            _.each(rows.rows, row => {
                let sensor = _.find(sensors, {key: row.sensor.toLowerCase()});
                if(!sensor) {
                    sensor = {
                        key: row.sensor.toLowerCase(),
                        name: row.sensor,
                        satellites: []
                    };
                    sensors.push(sensor);
                }
                let satellite = _.find(sensor.satellites, {key: row.satellite.toLowerCase()});
                if(!satellite) {
                    sensor.satellites.push({
                        key: row.satellite.toLowerCase(),
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