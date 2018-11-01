const Migration = require('./Migration');
const PgLayers = require('../layers/PgLayers');

class AddMetadataToLayer extends Migration {
    constructor(schema){
        super('2_10_1_AddMetadataToLayer', schema);

        this._schema = schema;
    }

    process(mongo, pool) {
        return pool.query(`
            ALTER TABLE ${this._schema}.${PgLayers.tableName()} ADD COLUMN metadata text;
            ALTER TABLE ${this._schema}.${PgLayers.tableName()} ADD COLUMN description text; 
        `);
    }
}

module.exports = AddMetadataToLayer;