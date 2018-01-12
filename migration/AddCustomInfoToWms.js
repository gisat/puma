let Migration = require('./Migration');
let PgWmsLayer = require('../layers/wms/PgWmsLayers');

class AddCustomInfoToWms extends Migration {
    constructor(schema) {
        super('AddCustomInfoToWms', schema);

        this._schema = schema;
    }

    process(mongo, pool) {
        return pool.query(`
            ALTER TABLE ${this._schema}.${PgWmsLayer.tableName()} ADD COLUMN custom text;           
        `);
    }
}

module.exports = AddCustomInfoToWms;