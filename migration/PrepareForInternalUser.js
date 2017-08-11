let Migration = require('./Migration');

let config = require('../config');

class PrepareForInternalUser extends Migration {
    constructor() {
        super('PrepareForInternalUser');
    }

    process(mongo, pool) {
        return pool.query(`
            ALTER TABLE ${config.postgreSqlSchema}.panther_users ADD COLUMN username text NOT NULL;
            ALTER TABLE ${config.postgreSqlSchema}.panther_users ADD COLUMN password text;
            ALTER TABLE ${config.postgreSqlSchema}.panther_users ADD COLUMN name text;            
        `);
    }
}

module.exports = PrepareForInternalUser;