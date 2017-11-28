let _ = require(`lodash`);

let config = require(`../config`);

let EmailNotifier = require(`./EmailNotifier`);
let SnowConfigurationTable = require(`./SnowConfigurationsTable`);
let PgUsers = require(`../security/PgUsers`);

class NotificationWatchdog {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }

    add(owner, config, type) {
        if (owner) {
            return this.get(owner, config, type)
                .then((record) => {
                    if (record) {
                        return this.update(owner, config, type);
                    } else {
                        let query = [];

                        query.push(`INSERT INTO "public"."nwatchdog" (`);
                        query.push(`owner,`);
                        query.push(`area_type,`);
                        query.push(`area_value,`);
                        query.push(`area_table,`);
                        query.push(`date_from,`);
                        query.push(`date_to,`);
                        query.push(`sensors,`);
                        query.push(`type,`);
                        query.push(`created`);
                        query.push(`) VALUES (`);
                        query.push(`${owner},`);
                        query.push(`'${config.area.type}',`);
                        query.push(`'${config.area.value}',`);
                        query.push(`'',`);
                        query.push(`' ${config.timeRange.start}',`);
                        query.push(`' ${config.timeRange.end}',`);
                        query.push(`' ${JSON.stringify(config.sensors)}',`);
                        query.push(`'${type}',`);
                        query.push(`${Date.now()}`);
                        query.push(`) RETURNING id;`);

                        return this._pgPool.query(query.join(` `))
                            .then((result) => {
                                if (result.rows.length) {
                                    return result.rows[0].id;
                                } else {
                                    throw new Error(`insert failed`);
                                }
                            });
                    }
                });
        } else {
            return Promise.resolve();
        }
    }

    get(owner, config, type) {
        let query = [];

        query.push(`SELECT * FROM "public"."nwatchdog"`);
        query.push(`WHERE`);
        query.push(`owner = ${owner}`);
        query.push(`AND area_type = '${config.area.type}'`);
        query.push(`AND area_value = '${config.area.value}'`);
        query.push(`AND area_table = ''`);
        query.push(`AND date_from = ' ${config.timeRange.start}'`);
        query.push(`AND date_to = ' ${config.timeRange.end}'`);
        query.push(`AND sensors = ' ${JSON.stringify(config.sensors)}'`);

        if (type) {
            query.push(`AND type = '${type}'`);
        }

        query.push(`;`);

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                if (result.rows.length) {
                    return result.rows;
                }
            });
    }

    update(owner, config, type, finish) {
        if (owner) {
            let query = [];

            query.push(`UPDATE "public"."nwatchdog"`);
            query.push(`SET updated = ${Date.now()}`);

            if (finish) {
                query.push(`, done = TRUE`);
            }

            query.push(`WHERE`);
            query.push(`owner = ${owner}`);
            query.push(`AND area_type = '${config.area.type}'`);
            query.push(`AND area_value = '${config.area.value}'`);
            query.push(`AND area_table = ''`);
            query.push(`AND date_from = ' ${config.timeRange.start}'`);
            query.push(`AND date_to = ' ${config.timeRange.end}'`);
            query.push(`AND sensors = ' ${JSON.stringify(config.sensors)}'`);
            query.push(`AND type = '${type}'`);
            query.push(`AND done IS NOT TRUE;`);

            return this._pgPool.query(query.join(` `));
        } else {
            return Promise.resolve();
        }
    }

    finish(owner, config, type) {
        return this.update(owner, config, type, true);
    }

    getGroupedByScope() {
        let query = [];

        query.push(`SELECT`);
        query.push(`owner,`);
        query.push(`area_type,`);
        query.push(`area_value,`);
        query.push(`area_table,`);
        query.push(`date_from::text,`);
        query.push(`date_to::text,`);
        query.push(`sensors,`);
        query.push(`array_agg(id) AS id,`);
        query.push(`array_agg(done) AS done,`);
        query.push(`array_agg(created) AS created,`);
        query.push(`array_agg(updated) AS updated,`);
        query.push(`array_agg(type) AS type`);
        query.push(`FROM public.nwatchdog`);
        query.push(`WHERE notified IS FALSE`);
        query.push(`GROUP BY`);
        query.push(`owner,`);
        query.push(`area_type,`);
        query.push(`area_value,`);
        query.push(`area_table,`);
        query.push(`date_from,`);
        query.push(`date_to,`);
        query.push(`sensors;`);

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                return result.rows;
            });
    }

    setAsNotified(ids) {
        let query = [];

        query.push(`UPDATE "public"."nwatchdog"`);
        query.push(`SET notified = TRUE`);
        query.push(`WHERE`);
        query.push(`id = ANY(ARRAY[${ids.join(`, `)}]);`);

        this._pgPool.query(query.join(` `));
    }

    static watchDog(pool) {
        let notificationWatchdog = new NotificationWatchdog(pool);
        let emailNotifier = new EmailNotifier(pool);
        let snowConfigurationTable = new SnowConfigurationTable(pool, "snow_configurations");
        let pgUsers = new PgUsers(pool, config.postgreSqlSchema);
        setInterval(async () => {
            await notificationWatchdog.getGroupedByScope(pool)
                .then(async (rows) => {
                    for (let row of rows) {
                        let owner = row.owner;
                        let created = row.created.sort().shift();
                        let updated = row.updated.sort().pop();
                        let ids = row.id.sort();
                        let types = row.type.sort();
                        let done = _.every(row.done, (done) => {
                            return done;
                        });
                        let area_type = row.area_type;
                        let area_value = row.area_value;
                        let area_table = row.area_table;
                        let date_from = row.date_from.replace(/-/g, '');
                        let date_to = row.date_to.replace(/-/g, '');
                        let sensors = JSON.parse(row.sensors);

                        let sensorsString = ``;
                        _.each(sensors, (satellites, sensor) => {
                            sensorsString += `${sensorsString.length ? '_' : ''}${sensor}`;
                            _.each(satellites, satellite => {
                                sensorsString += `-${satellite}`;
                            })
                        });

                        let compositeString = ``;
                        _.each(types, (type) => {
                            if (type.startsWith(`composites_`)) {
                                let period = type.split(`_`)[1];
                                if (period > 1) {
                                    compositeString += `${compositeString.length ? '-' : ''}${period}`;
                                }
                            }
                        });
                        compositeString = compositeString.length ? `/${compositeString}` : ``;

                        let configuration_url = `${config.remoteProtocol}://${config.remoteAddress}/snow/${area_value}/${date_from}-${date_to}/${sensorsString}${compositeString}`;
                        let configuration_name = `analysis_${ids[0]}`;

                        if (done && created && updated && Date.now() - updated >= 30000) {
                            await pgUsers.byId(owner)
                                .then((user) => {
                                    if (
                                        updated - created <= 60000
                                        || !user.email.match(/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i)
                                    ) {
                                        return notificationWatchdog.setAsNotified(ids);
                                    } else {
                                        return snowConfigurationTable.insert({
                                            url: configuration_url,
                                            user_id: owner,
                                            name: configuration_name
                                        }).then(() => {
                                            return emailNotifier.send(
                                                user.email,
                                                `<p>Dear user,</p>
                                                  <p>Your analysis has been successfully accomplished.</p>
                                                  <p>The results of your analysis have been saved as '${configuration_name}' in the 'Saved configurations' of your user account.</p>
                                                  <p>This email has been automatically generated by the <a href="http://snow.gisat.cz" target="_blank">Snow Portal</a></p>`
                                            );
                                        }).then(() => {
                                            return notificationWatchdog.setAsNotified(ids);
                                        });
                                    }
                                });
                        }
                    }
                });
        }, 5000);
    }

    static clearUnfinished(pool) {
        return pool.query(
            `DELETE FROM "public"."nwatchdog" WHERE "notified" IS NOT TRUE;`
        );
    }

    static initNotificationWatchdogPgTable(pool) {
        return pool.query(
            `CREATE TABLE IF NOT EXISTS "public"."nwatchdog" (
                    id serial,
                    owner integer,
                    area_type varchar(20),
                    area_value varchar(40),
                    area_table varchar(65),
                    date_from date,
                    date_to date,
                    sensors text,
                    type varchar(20),
                    created bigint,
                    updated bigint,
                    done boolean DEFAULT FALSE,
                    notified boolean DEFAULT FALSE,
                    PRIMARY KEY (id),
                    UNIQUE (owner, area_type, area_value, area_table, date_from, date_to, sensors, type)
                    );
                    `
        );
    }
}

module.exports = NotificationWatchdog;