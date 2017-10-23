let config = require('../config');

let Migration = require('./Migration');

class MigrateAwayFromGeonode extends Migration{
    constructor(schema) {
        super('MigrateAwayFromGeonode');

        this._schema = schema;
    }

    process(mongo, pool) {
        if(!config.isCleanInstance) {
            // Temporary pool for the last steps in migration away from Geonode.
            let geonodePool = new PgPool({
                user: config.pgDataUser,
                database: 'geonode',
                password: config.pgDataPassword,
                host: config.pgDataHost,
                port: config.pgDataPort
            });

            return geonodePool.query(`SELECT name, typename FROM layers_layer`).then(result => {
                let query = result.rows.map(row => `INSERT INTO ${this._schema}.layers (name, path) VALUES ('${row.name}', '${row.typename}');`).join(' ');

                return pool.query(query);
            });
        } else {
            return Promise.resolve(null);
        }
    }
}

module.exports = MigrateAwayFromGeonode;