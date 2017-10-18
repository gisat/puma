let superagent = require('superagent');
let config = require('../config');

let Migration = require('./Migration');

class MigrateAwayFromGeonode extends Migration{
    constructor(schema) {
        super('MigrateAwayFromGeonode');

        this._schema = schema;
    }

    process(mongo, pool) {
        // Load the information from the geonode db typename from layers_layer

        return superagent.get(config.geonodeUrl + 'layers/acls').then(result => {
            let promise = Promise.resolve(null);
            result.ro.forEach(layer => {
                promise = promise.then(() => {
                    return pool.query(`INSERT INTO ${this._schema}.layers (name, path) VALUES ('${layer}', '${layer}')`);
                })
            });

            return promise;
        });
    }
}

module.exports = MigrateAwayFromGeonode;