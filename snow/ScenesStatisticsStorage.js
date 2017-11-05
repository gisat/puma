class ScenesStatisticsStorage {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }

    initScenesStatisticsPgTable() {
        let query = [];

        query.push(`CREATE TABLE IF NOT EXISTS "scenes"."statistics" (`);
        query.push(`id serial,`);
        query.push(`scene_id integer NOT NULL,`);
        query.push(`date date NOT NULL,`);
        query.push(`sat_key varchar(20) NOT NULL,`);
        query.push(`sensor_key varchar(20) NOT NULL,`);
        query.push(`area_type varchar(20) NOT NULL,`);
        query.push(`area_key varchar(20) NOT NULL,`);
        query.push(`area_table varchar(63),`);
        query.push(`stats json NOT NULL,`);
        query.push(`PRIMARY KEY (id),`);
        query.push(`UNIQUE (scene_id, date, sat_key, sensor_key, area_type, area_key, area_table));`);

        return this._pgPool.query(query.join(` `));
    }

    insertSceneStatistics(sceneId, date, satKey, sensorKey, areaType, areaKey, stats, areaTable) {
        if(!sceneId || !date || !satKey || !sensorKey || !areaType || !areaKey || !stats) {
            return Promise.reject(`Missing some arguments!`);
        }

        areaTable = areaTable ? `'${areaTable}'` : `NULL`;

        let query = [];

        query.push(`INSERT INTO "scenes"."statistics" (`);
        query.push(`scene_id, date, sat_key, sensor_key, area_type, area_key, area_table, stats`);
        query.push(`) VALUES (`);
        query.push(`${sceneId}, '${date}', '${satKey}', '${sensorKey}', '${areaType}', '${areaKey}', ${areaTable}, '${JSON.stringify(stats)}'`);
        query.push(`);`);

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                if(result.rowCount === 0) {
                    throw new Error(`Unable to save scene statistics!`);
                } else {
                    return true;
                }
            });
    }

    getSceneStatistics(sceneId, date, satKey, sensorKey, areaType, areaKey, areaTable) {
        if(!sceneId || !date || !satKey || !sensorKey || !areaType || !areaKey) {
            return Promise.reject(`Missing some arguments!`);
        }

        let query = [];

        query.push(`SELECT stats`);
        query.push(`FROM "scenes"."statistics"`);
        query.push(`WHERE`);
        query.push(`scene_id=${sceneId}`);
        query.push(`AND date='${date}'`);
        query.push(`AND sat_key='${satKey}'`);
        query.push(`AND sensor_key='${sensorKey}'`);
        query.push(`AND area_type='${areaType}'`);
        query.push(`AND area_key='${areaKey}'`);

        if(areaTable) {
            query.push(`AND area_table='${areaTable}'`);
        }

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                if(result.rows.length) {
                    return result.rows[0].stats;
                } else {
                    return false;
                }
            });
    }

    deleteSceneStatistics(sceneId, date, satKey, sensorKey, areaType, areaKey, areaTable, removeAll) {
        if(!sceneId && !date && !satKey && !sensorKey && !areaType && !areaKey) {
            return Promise.reject(`Missing all arguments`);
        }

        let query = [];
        let whereQuery = [];

        if(sceneId) {
            whereQuery.push(`scene_id=${sceneId}`);
        }
        if(date) {
            whereQuery.push(`date='${date}'`);
        }
        if(satKey) {
            whereQuery.push(`sat_key='${satKey}'`);
        }
        if(sensorKey) {
            whereQuery.push(`sensor_key='${sensorKey}'`);
        }
        if(areaType) {
            whereQuery.push(`area_type='${areaType}'`);
        }
        if(areaKey) {
            whereQuery.push(`area_key='${areaKey}'`);
        }
        if(areaTable) {
            whereQuery.push(`area_table='${areaTable}'`);
        }

        query.push(`DELETE FROM "scenes"."statistics"`);
        query.push(`WHERE`);
        query.push(`${whereQuery.join(` AND `)}`);

        if(!removeAll) {
            query.push(`AND (SELECT COUNT(*) FROM "scenes"."statistics" WHERE ${whereQuery.join(` AND `)}) = 1`);
        }

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                if(result.rowCount === 0) {
                    throw new Error(`Multiple records found! Use removeAll switch to force delete!`);
                } else {
                    return true;
                }
            });
    }
}

module.exports = ScenesStatisticsStorage;