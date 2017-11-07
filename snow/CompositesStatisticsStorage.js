class CompositesStatisticsStorage {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }

    static initCompositesStatisticsPgTable(pool) {
        let query = [];

        query.push(`CREATE TABLE IF NOT EXISTS "composites"."statistics" (`);
        query.push(`id serial,`);
        query.push(`composite_key varchar(50) NOT NULL,`);
        query.push(`date_from date NOT NULL,`);
        query.push(`date_to date NOT NULL,`);
        query.push(`satellites text[] NOT NULL,`);
        query.push(`sensors text[] NOT NULL,`);
        query.push(`area_type varchar(20) NOT NULL,`);
        query.push(`area_key varchar(20) NOT NULL,`);
        query.push(`area_table varchar(63),`);
        query.push(`stats json NOT NULL,`);
        query.push(`PRIMARY KEY (id),`);
        query.push(`UNIQUE (composite_key, date_from, date_to, satellites, sensors, area_type, area_key, area_table));`);

        return pool.query(query.join(` `));
    }

    insertStatistics(key, date, satellites, sensors, areaType, areaKey, stats, areaTable) {
        if(!key || !date || !satellites || !sensors || !areaType || !areaKey || !stats) {
            return Promise.reject(`Missing some arguments!`);
        }

        areaTable = areaTable ? `'${areaTable}'` : `NULL`;

        let query = [];

        query.push(`INSERT INTO "composites"."statistics" (`);
        query.push(`composite_key, date_from, date_to, satellites, sensors, area_type, area_key, area_table, stats`);
        query.push(`) VALUES (`);
        query.push(`'${key}',`);
        query.push(`'${date.from}',`);
        query.push(` '${date.to}',`);
        query.push(`ARRAY['${satellites.join(`', '`)}'],`);
        query.push(`ARRAY['${sensors.join(`', '`)}'],`);
        query.push(`'${areaType}',`);
        query.push(`'${areaKey}',`);
        query.push(`'${areaTable}',`);
        query.push(`'${JSON.stringify(stats)}'`);
        query.push(`);`);

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                if(result.rowCount === 0) {
                    throw new Error(`Unable to save composite statistics!`);
                } else {
                    return true;
                }
            });
    }

    getStatistics(key, date, satellites, sensors, areaType, areaKey, areaTable) {
        if(!key || !date || !satellites || !sensors|| !areaType || !areaKey) {
            return Promise.reject(`Missing some arguments!`);
        }

        let query = [];

        query.push(`SELECT stats`);
        query.push(`FROM "composites"."statistics"`);
        query.push(`WHERE`);
        query.push(`composite_key='${key}'`);
        query.push(`AND date_from='${date.from}'`);
        query.push(`AND date_to='${date.to}'`);
        query.push(`AND satellites @> ARRAY['${satellites.join(`', '`)}']`);
        query.push(`AND satellites <@ ARRAY['${satellites.join(`', '`)}']`);
        query.push(`AND sensors @> ARRAY['${sensors.join(`', '`)}']`);
        query.push(`AND sensors <@ ARRAY['${sensors.join(`', '`)}']`);
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

    deleteStatistics(key, date, satKey, sensorKey, areaType, areaKey, areaTable, removeAll) {
        if(!key && !date && !satKey && !sensorKey && !areaType && !areaKey) {
            return Promise.reject(`Missing all arguments`);
        }

        let query = [];
        let whereQuery = [];

        if(key) {
            whereQuery.push(`composite_key='${key}'`);
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

        query.push(`DELETE FROM "composites"."statistics"`);
        query.push(`WHERE`);
        query.push(`${whereQuery.join(` AND `)}`);

        if(!removeAll) {
            query.push(`AND (SELECT COUNT(*) FROM "composites"."statistics" WHERE ${whereQuery.join(` AND `)}) = 1`);
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

module.exports = CompositesStatisticsStorage;