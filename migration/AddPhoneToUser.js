let Migration = require('./Migration');
let PgUsers = require('../security/PgUsers');

class AddPhoneToUser extends Migration {
    constructor(schema) {
        super('AddPhoneToUser', schema);

        this._schema = schema;
    }

    process(mongo, pool) {
        return pool.query(`
            ALTER TABLE ${this._schema}.${PgUsers.tableName()} ADD COLUMN phone text;           
        `);
    }
}

module.exports = AddPhoneToUser;