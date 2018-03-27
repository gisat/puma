let Migration = require('./Migration');
let PgWmsLayer = require('../layers/wms/PgWmsLayers');

class AddGetDatesToWmsLayers extends Migration {
    constructor(schema) {
        super('AddGetDatesToWmsLayers', schema);

        this._schema = schema;
    }

    process(mongo, pool) {
        return pool.query(`
            ALTER TABLE ${this._schema}.${PgWmsLayer.tableName()} ADD COLUMN get_date boolean;           
        `);
    }
}

module.exports = AddGetDatesToWmsLayers;