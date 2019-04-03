const Migration = require('./Migration');

class AddIdentifierToGroup extends Migration {
    constructor(schema){
        super('2_14_1_AddIdentifierToGroup', schema);

        this._schema = schema;
    }

    process(mongo, pool) {
        return pool.query(`
            ALTER TABLE ${this._schema}.groups ADD COLUMN identifier TEXT;
            ALTER TABLE ${this._schema}.layers ADD COLUMN custom text;
        `);
    }
}

module.exports = AddIdentifierToGroup;