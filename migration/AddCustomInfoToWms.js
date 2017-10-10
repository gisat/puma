let Migration = require('./Migration');
let PgWmsLayer = require('../layers/wms/PgWmsLayers');

let config = require('../config');

class AddCustomInfoToWms extends Migration {
    constructor(schema) {
        super('AddCustomInfoToWms');

        this._schema = schema;
    }

    process(mongo, pool) {
        return pool.query(`
            ALTER TABLE ${this._schema}.${PgWmsLayer.tableName()} ADD COLUMN custom text;           
        `);
    }
}

module.exports = AddCustomInfoToWms;