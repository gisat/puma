const {Pool} = require('pg');
const {Client} = require('pg');
const config = require('../config');

let pool;

/**
 * @callback Transactional
 * @param {TransactionalCallback} cb
 * @returns {Promise}
 *
 * @callback SetUser
 * @param {string|null} user
 * @returns {Promise}
 *
 * @typedef ClientExtension
 * @property {Transactional} transactional
 * @property {SetUser} setUser
 *
 * @typedef {import('pg').Client & ClientExtension} Client
 *
 * @callback TransactionalCallback
 * @param {Client} client
 */

/**
 * Puts query into the pool to be executed by free connection
 */
function query(queryTextOrConfig, values) {
    return pool.query(queryTextOrConfig, values);
}

/**
 * Sets user for current transaction. This user will be shown in audit.
 *
 * @param {Client} client
 * @param {string|null} user
 */
async function setUser(client, user) {
    await client.query("SELECT SET_CONFIG('app.user', $1, true)", [user]);
}

/**
 * Get exclusive client to execute queries with (nobody else can use it at the same time).
 * Runs all queries in transaction.
 *
 * @param {TransactionalCallback} cb
 */
async function transactional(cb) {
    const client = await pool.connect();
    client.transactional = async function (cb) {
        return cb(client);
    };
    client.setUser = function (user) {
        return setUser(client, user);
    };

    try {
        await client.query('BEGIN');
        const result = await cb(client);
        await client.query('COMMIT');
        client.release();

        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        client.release(err);
        throw err;
    }
}

function getSuperUserClient() {
    return new Client(config.pgConfig.superuser || config.pgConfig.normal);
}

function init() {
    if (pool != null) {
        return;
    }

    pool = new Pool(config.pgConfig.normal);
}

module.exports = {
    init,
    query,
    transactional,
    getSuperUserClient,
};
