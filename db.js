const PgPool = require('./postgresql/PgPool');

let pool;

/**
 * Puts query into the pool to be executed by free connection
 */
function query(queryTextOrConfig, values) {
    return pool.query(queryTextOrConfig, values);
}

/**
 * Get exclusive client to execute queries with (nobody else can use it at the same time).
 * Runs all queries in transaction.
 */
async function transactional(cb) {
    const client = await pool.connect();

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

function init() {
    if (pool != null) {
        return;
    }

    pool = new PgPool().getPool();
}

/**
 * @deprecated Pool should be internal to this module.
 *   This funciton is here just because of backward compatibility;
 */
function getPool() {
    return pool;
}

module.exports = {
    init,
    query,
    transactional,
    getPool,
};
