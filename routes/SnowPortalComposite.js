let _ = require("lodash");
let Promise = require("promise");
let hash = require("object-hash");
let child_process = require('pn/child_process');
let superagent = require('superagent');

let logger = require('../common/Logger').applicationWideLogger;

let composites = {};

/**
 *
 */
class SnowPortalComposite {
    constructor (pgPool, startDay, endDay, period, sensors, area) {
        // input validation
        if (!pgPool){
            throw new Error(logger.error("SnowPortalComposite#constructor: pgPool must be specified"));
        }
        if (!endDay && !period){
            throw new Error(logger.error("SnowPortalComposite#constructor: endDay or period must be specified"));
        }
        if (!startDay){
            throw new Error(logger.error("SnowPortalComposite#constructor: startDay must be specified"));
        }
        if (!Array.isArray(sensors) || !sensors.length){
            throw new Error(logger.error("SnowPortalComposite#constructor: sensors must be not empty array"));
        }
        if (!area){
            throw new Error(logger.error("SnowPortalComposite#constructor: area must be specified"));
        }

        // input
        this._pgPool = pgPool;
        this._startDay = startDay;
        let completeDateConfiguration = SnowPortalComposite.getCompleteDateConfiguration(this._startDay, endDay, period);
        this._endDay = completeDateConfiguration.endDay;
        this._period = completeDateConfiguration.period;
        this._sensors = sensors;
        this._area = area;

        this._tmpTiffLocation = "/tmp/";

        this._key = SnowPortalComposite.createKey(this._startDay, this._endDay, this._period, this._sensors, this._area);


        /**
         * Test if composite is in memory
         */
        if(composites[this._key]) {
            logger.info(`SnowPortalComposite#constructor *** Composite is already being created.`);
            return composites[this._key];
        }
        logger.info(`SnowPortalComposite#constructor *** no ` + this._key);
        composites[this._key] = this;



        let getMetadataSql = SnowPortalComposite.getMetadataSql(this._startDay, this._endDay, this._period, this._sensors);

        this._metadata = this._pgPool.pool().query(getMetadataSql).then(result => {
            if (result.rows.length > 1) {
                logger.warn(`SnowPortalComposite#constructor More then one metadata results! (${result.rows.length}) ${result.rows}`);
            }

            if (result.rows.length) {
                /**
                 * Composite already exists in database.
                 */
                logger.info(`SnowPortalComposite#constructor Composite exists. Metadata: ${result.rows[0]}`);
                this._key = result.rows[0].key;
                return result.rows[0];
            } else {
                /**
                 * Composite doesn't exist. Let's create.
                 */
                logger.info(`SnowPortalComposite#constructor Composite doesn't exist. Creating new.`);
                return this.create();
            }
        });

    }

    /**
     * Returns period - number of days of composite
     * @returns {number|*}
     */
    getPeriod() {
        return this._period;
    }

    /**
     *
     * @returns Promise
     */
    getMetadata() {
        return this._metadata;
    }

    getKey() {
        return this._key;
    }


    /**
     *
     * @returns Promise
     */
    create() {
        logger.info(`SnowPortalComposite#create ------- ${this._startDay}-${this._endDay} (${this._period} days) sensors: ${this._sensors}`);
        let usedScenes = [];

        return new Promise((resolve, reject) => {
            /**
             * First steps different for one-day and n-day composites
             */


            if (this._period > 1) {
                /**
                 * N-DAY COMPOSITE
                 */

                /**
                 * get or create one-day composites
                 */
                let oneDayDates = SnowPortalComposite.getCompositeDates(this._startDay, this._endDay, 1);
                let oneDayComposites = [];
                _.each(oneDayDates, date => {
                    let oneDayComposite = new SnowPortalComposite(this._pgPool, date, null, 1, this._sensors, this._area);
                    oneDayComposites.push(oneDayComposite.getMetadata());
                });

                /**
                 * Composite one-day composites to one composite
                 */
                Promise.all(oneDayComposites).then(compositesMetadata => {
                    let tables = [];
                    _.each(compositesMetadata, composite => {
                        tables.push(composite.key);
                        usedScenes = _.union(usedScenes, composite.usedScenes);
                    });

                    this._key = "composite_" + hash({
                            startDay: this._startDay,
                            endDay: this._endDay,
                            period: this._period,
                            sensors: this._sensors,
                            area: this._area,
                            usedScenes: usedScenes
                        });

                    let sql = SnowPortalComposite.createMultiDayCompositeSql(this._key, tables);
                    logger.info(`SnowPortalComposite#create ------ Generating n-day composite from ${this._startDay} to ${this._endDay} (${this._period} days) ` +
                        `for sensors ${this._sensors} in area ${this._area} from scenes ${usedScenes}
                    | key: ${this._key}
                    | SQL: ${sql}`);
                    this._pgPool.pool().query(sql).then(() => {
                        logger.info(`SnowPortalComposite#create ------ Generating n-day composite finished.`);
                        resolve();
                    }).catch(error => {
                        reject(new Error(logger.error(`SnowPortalComposite#create ------ Generating n-day composite Error: ${error} | ${sql}`)));
                    });

                });



            } else {
                /**
                 * ONE-DAY COMPOSITE
                 */


                resolve(new Promise((resolve, reject) => {
                    /**
                     * get IDs of used scenes
                     */
                    let sql = SnowPortalComposite.getScenesIDsSql(this._startDay, this._sensors); // TODO only for period=1
                    this._pgPool.pool().query(sql).then((results) => {
                        _.each(results.rows, scene => {
                            usedScenes.push(scene.id);
                        });

                        if (!usedScenes.length) {
                            reject(new Error(logger.error(`SnowPortalComposite#create ------ No scenes for sensors [${this._sensors}] for date ${this._startDay}.`)));
                        }

                        resolve(usedScenes);
                    }).catch(error => {
                        reject(new Error(logger.error(`SnowPortalComposite#create ------ Creating composite, get IDs Error: ${error.message} | ${error}`)));
                    });
                }).then(() => {
                    /**
                     * Generate composite
                     */
                    return new Promise((resolve, reject) => {
                        this._key = "composite_" + hash({
                                startDay: this._startDay,
                                endDay: this._endDay,
                                period: this._period,
                                sensors: this._sensors,
                                area: this._area,
                                usedScenes: usedScenes
                            });
                        let sql = SnowPortalComposite.createOneDayCompositeSql(this._key, this._startDay, this._sensors);
                        logger.info(`SnowPortalComposite#create ------ Generating one-day composite for ${this._startDay} ` +
                            `for sensors ${this._sensors} in area ${this._area} from scenes ${usedScenes}
                        | key: ${this._key}
                        | SQL: ${sql}`);
                        this._pgPool.pool().query(sql).then(() => {
                            logger.info(`SnowPortalComposite#create ------ Generating one-day composite finished.`);
                            resolve();
                        }).catch(error => {
                            reject(new Error(logger.error(`SnowPortalComposite#create ------ Generating one-day composite Error: ${error} | ${sql}`)));
                        });
                    });
                }));
            }
        }).then(() => {
            /**
             * Save composite metadata
             */
            return new Promise((resolve, reject) => {
                let sql = SnowPortalComposite.saveCompositeMetadataSql(this._key, this._startDay, this._endDay, this._period, this._sensors, this._area, usedScenes);
                logger.info(`SnowPortalComposite#create ------ Saving composite metadata | SQL: ${sql}`);
                this._pgPool.pool().query(sql).then(result => {
                    logger.info(`SnowPortalComposite#create ------ Saving composite metadata finished. ${result.rows[0]}`);
                    resolve();
                }).catch(error => {
                    reject(new Error(logger.error(`SnowPortalComposite#create ------ Creating composite, saving metadata Error: ${error.message} | ${error}`)));
                });
            });
        }).then(() => {
            /**
             * Export composite to GeoTiff
             * TODO for Windows?
             */
            return new Promise((resolve) => {
                let command = `gdal_translate "PG:host=localhost port=5432 dbname=geonode_data user=geonode password=geonode schema=composites table=${this._key} mode=2" ${this._tmpTiffLocation}${this._key}.tif`;
                logger.info(`SnowPortalComposite#create ------ Exporting GeoTiff of the composite ${this._key}`);
                resolve(child_process.exec(command).promise);
            });
        }).then(() => {
            /**
             * Import GeoTiff to Geoserver
             * TODO for Windows?
             */
            return new Promise((resolve) => {
                let command = `curl -u admin:geoserver -XPUT -H "Content-type:image/tiff" --data-binary @${this._tmpTiffLocation}${this._key}.tif http://localhost/geoserver/rest/workspaces/geonode/coveragestores/${this._key}/file.geotiff`;
                logger.info(`SnowPortalComposite#create ------ Importing GeoTiff in Geoserver (${this._key})`);
                resolve(child_process.exec(command).promise);
            });
        }).then(() => {
            /**
             * Publish GeoTiff in GeoNode
             * TODO for Windows?
             */
            logger.info(`SnowPortalComposite#create ------ Publishing Geoserver raster layer in GeoNode (${this._key})`);
            return superagent.get(`http://localhost/cgi-bin/updatelayers?f=${this._key}`);

        }).then(() => {
            /**
             * Delete GeoTiff
             * TODO for Windows?
             */
            return new Promise((resolve) => {
                logger.info(`SnowPortalComposite#create ------ Deleting GeoTiff file ${this._key}.tif`);
                child_process.exec(`rm ${this._tmpTiffLocation}${this._key}.tif`).promise.then(() => {
                    resolve({
                        date_start: this._startDay,
                        usedScenes: usedScenes,
                        key: this._key
                    });
                });
            });
        }).catch(error => {
            logger.error(`SnowPortalComposite#create ------ Error ${error.message}`);
            throw error;
        });
    }




    ///// STATIC //////

    static createKey(startDay, endDay, period, sensors, area) {
        let completeConf = SnowPortalComposite.getCompleteDateConfiguration(startDay, endDay, period);
        return "composite_" + hash({
                startDay: startDay,
                endDay: completeConf.endDay,
                period: completeConf.period,
                sensors: sensors.sort(),
                area: area
            });
    }

    static getCompleteDateConfiguration(startDay, endDay, period) {
        if (period) {
            return {
                startDay: startDay,
                endDay: SnowPortalComposite.addDays(startDay, period - 1).toISOString().split("T")[0],
                period: period,
            };
        } else {
            return {
                startDay: startDay,
                endDay: endDay,
                period: SnowPortalComposite.getDatesDiff(startDay, endDay) + 1
            };
        }
    }

    /**
     * Generate array of SQL string dates for composites - based on time range and period.
     * @param timeRangeStart
     * @param timeRangeEnd
     * @param period
     * @returns {Array} Array of SQL date strings
     */
    static getCompositeDates(timeRangeStart, timeRangeEnd, period) {
        // create dates - array with SQL dates, begginings of composite periods
        let dates = [];
        let dateObj = new Date(timeRangeStart);
        let timeRangeEndObj = new Date(timeRangeEnd);
        let endDate;
        while((endDate = SnowPortalComposite.addDays(dateObj, period - 1)) <= timeRangeEndObj){
            dates.push(dateObj.toISOString().split('T')[0]);
            dateObj = SnowPortalComposite.addDays(endDate, 1);
        }
        return dates;
    }

    /**
     * Get number of days between two dates
     * @param date1
     * @param date2
     * @returns {number}
     */
    static getDatesDiff (date1, date2) {
        let date1Obj = new Date(date1);
        let date2Obj = new Date(date2);
        let timeDiff = Math.abs(date2Obj.getTime() - date1Obj.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    /**
     * Add n days to date and return Date instance
     * @param date Date instance or date in string
     * @param days Number of days to add, can be negative
     * @returns {Date}
     */
    static addDays(date, days){
        let result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static convertArrayToSqlAny(array) {
        return "ANY (" + SnowPortalComposite.convertArrayToSqlArray(array) + " :: VARCHAR [])";
    }

    static convertArrayToSqlArray(array) {
        return "ARRAY [" + array.map(function (value) {
                return '\'' + value + '\'';
            }).join(",") + "]";
    }


    static getMetadataSql(startDay, endDay, period, sensors) {
        return `
            SELECT
                m.key,
                m.date_start :: VARCHAR
            FROM
                composites.metadata m
            WHERE
                m.date_start = '${startDay}'
                AND m.date_end = '${endDay}'
                AND m.period = ${period}
                AND m.sensors <@ ${SnowPortalComposite.convertArrayToSqlArray(sensors)}
                AND m.sensors @> ${SnowPortalComposite.convertArrayToSqlArray(sensors)};`
    }

    /**
     * Create SQL query for selecting Scene IDs for one-day composite creation
     * @param date
     * @param sensors
     * @returns {string}
     */
    static getScenesIDsSql(date, sensors) {
        return `
            SELECT
                m.id
            FROM
                metadata AS m
                INNER JOIN source AS s ON (m.source_id = s.id)
            WHERE
                s.sensor_key = ${SnowPortalComposite.convertArrayToSqlAny(sensors)}
                AND m.date = '${date}';`;
    }


    /**
     * Create SQL query for creating one-day composites
     * @param tableName
     * @param date
     * @param sensors
     * @returns {string}
     */
    static createOneDayCompositeSql(tableName, date, sensors) {
        return `
            CREATE TABLE composites.${tableName}
                AS SELECT
                        ST_Union(t.rast, 1, 'MAX') as rast
                    FROM (
                            SELECT DISTINCT st_centroid(extent) AS centroid
                            FROM rasters
                        ) AS foo,
                        tile AS t
                        INNER JOIN rasters AS r ON (r.rid = t.rid)
                        INNER JOIN metadata AS m ON (m.id = r.metadata_id)
                        INNER JOIN source AS s ON (s.id = m.source_id)
                    WHERE r.extent && foo.centroid
                        AND m.date = '${date}'
                        AND s.sensor_key = ${SnowPortalComposite.convertArrayToSqlAny(sensors)}
                    GROUP BY foo.centroid;`;
    }

    static createMultiDayCompositeSql(tableName, oneDayTables) {
        let union = oneDayTables.map(value => {
                return `SELECT rast FROM composites.${value}`;
            }).join(" UNION ");

        return `
            CREATE TABLE composites.${tableName}
                AS SELECT
                    ST_Union(uni.rast, 1, 'MAX') as rast
                FROM (
                    ${union}
                ) AS uni;`;
    }

    /**
     *
     * @param tableName
     * @param startDate
     * @param endDate
     * @param period
     * @param sensors
     * @param area
     * @param usedScenes
     * @returns {string}
     */
    static saveCompositeMetadataSql(tableName, startDate, endDate, period, sensors, area, usedScenes) {
        return `
            INSERT INTO composites.metadata
                (key, sensors, date_start, date_end, period, area, used_scenes)
                VALUES ('${tableName}', ${SnowPortalComposite.convertArrayToSqlArray(sensors)}, '${startDate}', '${endDate}', ${period}, '${area}', ${this.convertArrayToSqlArray(usedScenes)});`;
    }

}

module.exports = SnowPortalComposite;