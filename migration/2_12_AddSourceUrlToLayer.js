const Migration = require('./Migration');
const PgLayers = require('../layers/PgLayers');

class AddSourceUrlToLayer extends Migration {
    constructor(schema){
        super('2_12_AddSourceUrlToLayer', schema);

        this._schema = schema;
    }

    process(mongo, pool) {
        return pool.query(`
            ALTER TABLE ${this._schema}.${PgLayers.tableName()} ADD COLUMN source_url text; 
        `);
    }
}

module.exports = AddSourceUrlToLayer;