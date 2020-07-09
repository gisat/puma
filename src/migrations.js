const config = require('../config');
const db = require('./db');
const Postgrator = require('postgrator');

async function ensureDb() {
    if (!config.pgConfig.superuser) {
        return;
    }

    const pgClient = db.getSuperUserClient();
    await pgClient.connect();
    await pgClient
        .query(`CREATE ROLE "${config.pgConfig.normal.user}"`)
        .catch((error) => {
            console.log(`#WARNING#`, error.message);
        });

    await pgClient
        .query(
            `ALTER ROLE "${config.pgConfig.normal.user}" PASSWORD '${config.pgConfig.normal.password}'`
        )
        .catch((error) => {
            console.log(`#WARNING#`, error.message);
        });

    await pgClient
        .query(`ALTER ROLE "${config.pgConfig.normal.user}" LOGIN`)
        .catch((error) => {
            console.log(`#WARNING#`, error.message);
        });

    await pgClient
        .query(`ALTER ROLE "${config.pgConfig.normal.user}" SUPERUSER`)
        .catch((error) => {
            console.log(`#WARNING#`, error.message);
        });
    await pgClient
        .query(`CREATE DATABASE "panther" WITH OWNER "panther";`)
        .catch((error) => {
            console.log(`#WARNING#`, error.message);
        });

    await pgClient.end();
}

function createPostgrator() {
    const normalConfig = config.pgConfig.normal;

    return new Postgrator({
        migrationDirectory: __dirname + '/../migrations',
        driver: 'pg',
        host: normalConfig.host,
        database: normalConfig.database,
        username: normalConfig.user,
        password: normalConfig.password,
        schemaTable: 'public.schemaversion',
    });
}

async function migrate(version = 'max') {
    await ensureDb();
    const appliedMigrations = await createPostgrator().migrate(version);
    if (appliedMigrations.length > 0) {
        console.log(appliedMigrations);
    }
}

module.exports = {
    migrate,
};
