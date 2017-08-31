let Migration = require('./Migration');
let bcrypt = require('bcrypt');

let config = require('../config');

class PrepareForInternalUser extends Migration {
    constructor() {
        super('PrepareForInternalUser');
    }

    process(mongo, pool) {
        return bcrypt.hash('admin', 10).then(hash => {
            return pool.query(`
                ALTER TABLE ${config.postgreSqlSchema}.panther_users ADD COLUMN password text;
                ALTER TABLE ${config.postgreSqlSchema}.panther_users ADD COLUMN name text;
                 
                INSERT INTO ${config.postgreSqlSchema}.panther_users (email, name, password) values ('admin','admin','${hash}');           
            `);
        });
    }
}

module.exports = PrepareForInternalUser;