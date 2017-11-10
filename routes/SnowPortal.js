let _ = require("lodash");
let logger = require('../common/Logger').applicationWideLogger;

let config = require(`../config`);

let ScenesManager = require('../snow/ScenesManager');
let CompositeManager = require('../snow/CompositeManager');
let FileSystemManager = require(`../snow/FileSystemManager`);
let UserRegistration = require(`../snow/UserRegistration`);
let ScenesStatisticsStorage = require(`../snow/ScenesStatisticsStorage`);
let CompositesStatisticsStorage = require(`../snow/CompositesStatisticsStorage`);
let GeoserverImporter = require(`../layers/GeoServerImporter`);

let processes = {};

class SnowPortal {
    constructor(app, pool, longRunningPool) {
        this._pgPool = pool;
        this._pgLongRunningPool = longRunningPool;
        this._fileSystemManager = new FileSystemManager(this._pgPool);
        this._scenesManager = new ScenesManager(this._pgPool, this._pgLongRunningPool);
        this._compositeManager = new CompositeManager(this._pgPool, this._pgLongRunningPool);
        this._userRegistration = new UserRegistration(this._pgPool);
        this._scenesStatisticsStorage = new ScenesStatisticsStorage(this._pgPool);
        this._compositesStatisticsStorage = new CompositesStatisticsStorage(this._pgPool);
        this._geoserverImporter = new GeoserverImporter(
            config.geoserverPath,
            config.geoserverUsername,
            config.geoserverPassword,
            config.snow.geoserverWorkspace
        );

        app.get("/api/snowportal/scopeoptions", this.getScopeOptions.bind(this));
        app.post("/api/snowportal/scenes", this.getScenes.bind(this));
        app.post("/api/snowportal/composites", this.getComposites.bind(this));
        app.post(`/api/snowportal/registration`, this.registration.bind(this));

        app.get("/rest/composites/metadata", this.getCompositesMetadata.bind(this));

        app.post(`/rest/snowportal/download`, this.download.bind(this));

        this.checkForMissingGeoserverLayers();
    }

    registration(request, response) {
        this._userRegistration.register(request.body)
            .then((registrationResponse) => {
                response.status(registrationResponse.success ? 200 : 500).send(registrationResponse);
            })
            .catch((error) => {
                response.status(500).send({message: error.message, success: false});
            })
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
            if (result.success) {
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
            if (result.success) {
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

        this._pgPool.query(`SELECT DISTINCT "NAME" as name, "KEY" as key FROM areas ORDER BY "NAME"`).then(rows => {
            if (!rows.rows) {
                throw new Error(logger.error("Unable to get areas from database..."));
            }
            options.areas = _.map(rows.rows, row => {
                return {
                    key: row.key,
                    name: row.name
                }
            });
            return this._pgPool.query(
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

    checkForMissingGeoserverLayers() {
        this._geoserverImporter.getGeoserverLayers()
            .then(async (geoserverLayers) => {
                await this._scenesStatisticsStorage.getScenesWithStatistics()
                    .then(async (sceneIds) => {
                        let sceneKeys = _.map(sceneIds, (sceneId) => {
                            return `scene_${sceneId}`;
                        });
                        let geoserverSceneLayers = _.filter(geoserverLayers, (geoserverLayer) => {
                            return geoserverLayer.startsWith(`scene_`);
                        });
                        for (let sceneKey of sceneKeys) {
                            if (!geoserverSceneLayers.includes(sceneKey)) {
                                console.log(`#### Importing missing geoserver layer ${sceneKey}`);
                                await this._geoserverImporter.importLayer(
                                    {
                                        systemName: sceneKey,
                                        type: `raster`,
                                        file: `${config.snow.paths.scenesGeotiffStoragePath}/${sceneKey}.tif`
                                    },
                                    true
                                );
                            }
                        }
                        let unusedGoeserverLayers = _.difference(geoserverSceneLayers, sceneKeys);
                        for(let unusedGeoserverLayer of unusedGoeserverLayers) {
                            console.log(`#### Removing unused geoserver layer ${unusedGeoserverLayer}`);
                            await this._geoserverImporter.removeRasterLayer(unusedGeoserverLayer);
                        }
                    });
                await this._compositesStatisticsStorage.getComposites()
                    .then(async (compositeKeys) => {
                        compositeKeys = _.map(compositeKeys, (compositeKey) => {
                            return `composite_${compositeKey}`;
                        });
                        let geoserverCompositeLayers = _.filter(geoserverLayers, (geoserverLayer) => {
                            return geoserverLayer.startsWith(`composite_`);
                        });
                        for (let compositeKey of compositeKeys) {
                            if (!geoserverCompositeLayers.includes(compositeKey)) {
                                console.log(`#### Importing missing geoserver layer ${compositeKey}`);
                                await this._geoserverImporter.importLayer(
                                    {
                                        systemName: compositeKey,
                                        type: `raster`,
                                        file: `${config.snow.paths.compositesGeotiffStoragePath}/${compositeKey}.tif`
                                    },
                                    true
                                );
                            }
                        }
                        let unusedGoeserverLayers = _.difference(geoserverCompositeLayers, compositeKeys);
                        for(let unusedGeoserverLayer of unusedGoeserverLayers) {
                            console.log(`#### Removing unused geoserver layer ${unusedGeoserverLayer}`);
                            await this._geoserverImporter.removeRasterLayer(unusedGeoserverLayer);
                        }
                    });
            });
    }
}


module.exports = SnowPortal;