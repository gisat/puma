let _ = require("lodash");
let logger = require('../common/Logger').applicationWideLogger;

let GeotiffGenerator = require('../integration/GeotiffGenerator');
let ScenesManager = require('../snow/ScenesManager');
let CompositeManager = require('../snow/CompositeManager');

let FileSystemManager = require(`../snow/FileSystemManager`);
let PromiseQueue = require(`../snow/PromiseQueue`);

let processes = {};

class SnowPortal {
    constructor(app, pool, longRunningPool) {
        this._pgPool = pool;
        this._pgLongRunningPool = longRunningPool;
        this._promiseQueue = new PromiseQueue();
        this._geotiffGenerator = new GeotiffGenerator(this._pgLongRunningPool, this._promiseQueue);
        this._fileSystemManager = new FileSystemManager(this._pgPool);
        this._scenesManager = new ScenesManager(this._pgPool, this._pgLongRunningPool);
        this._compositeManager = new CompositeManager(this._pgPool, this._pgLongRunningPool);

        app.get("/api/snowportal/scopeoptions", this.getScopeOptions.bind(this));
        app.post("/api/snowportal/scenes", this.getScenes.bind(this));
        app.post("/api/snowportal/composites", this.getComposites.bind(this));

        app.get("/rest/composites/metadata", this.getCompositesMetadata.bind(this));

        app.post(`/rest/snowportal/download`, this.download.bind(this));

        this._area = 'europe'; // TODO set dynamicaly?

        this._visibleClasses = ["S", "NS", "C", "NC"];
    }

    download(request, response) {
        this._fileSystemManager.publishPackageWithSnowGeoTiffs(request.body, request.url)
            .then((fsmResponse) => {
                response.status(fsmResponse.success ? 200 : 500).send(fsmResponse);
            })
            .catch((error) => {
                response.status(500).send({message: error.message, success: false});
            });
    }

    getCompositesMetadata(request, response) {
        this._pgPool.query(`SELECT * FROM composites.metadata ORDER BY date_start`).then(result => {
            response.status(500).json({metadata: result.rows});
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
        this._scenesManager.getScenesStatistics(request).then((result) => {
            if(result.success) {
                response.status(200).send(result);
            } else {
                response.status(500).send(result);
            }
        }).catch((error) => {
            response.status(500).send({
                message: error.message,
                success: false
            });
        });
    }

    /**
     * API composites endpoint
     * @param request
     * @param response
     */
    getComposites(request, response) {
        this._compositeManager.getCompositesStatistics(request).then((result) => {
            if(result.success) {
                response.status(200).send(result);
            } else {
                response.status(500).send(result);
            }
        }).catch((error) => {
            response.status(500).send({
                message: error.message,
                success: false
            });
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
            return this._pgPool.pool().query(
                `SELECT
                        sat as satellite,
                        sat_key as satellite_key,
                        sensor,
                        sensor_key,
                        min(date) as from,
                        max(date) as to
                     FROM scenes.metadata
                    GROUP BY satellite, satellite_key, sensor, sensor_key;
               `);
        }).then((result) => {
            if (!result.rows) {
                throw new Error(logger.error("Unable to get satellites and sensors from database..."));
            }
            let sensors = [];
            _.each(result.rows, row => {
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
}


module.exports = SnowPortal;