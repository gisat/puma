let Migration = require('./Migration');

let config = require('../config');

class PrepareForInternalUser extends Migration {
    constructor() {
        super('PrepareForInternalUser');
    }

    process(mongo, pool) {
        return pool.query(`
            ALTER TABLE ${config.postgreSqlSchema}.panther_users ADD COLUMN username TYPE text NOT NULL;
            ALTER TABLE ${config.postgreSqlSchema}.panther_users ADD COLUMN password TYPE text;
            ALTER TABLE ${config.postgreSqlSchema}.panther_users ADD COLUMN name TYPE text;            
        `);
    }
}

module.exports = PrepareForInternalUser;