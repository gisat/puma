let Migration = require('./Migration');
let bcrypt = require('bcrypt');

let config = require('../config');

class PrepareForInternalUser extends Migration {
    constructor(schema) {
        super('PrepareForInternalUser');

        this._schema = schema;
    }

    process(mongo, pool) {
        return bcrypt.hash('admin', 10).then(hash => {
            return pool.query(`
                ALTER TABLE ${this._schema}.panther_users ADD COLUMN password text;
                ALTER TABLE ${this._schema}.panther_users ADD COLUMN name text;
                 
                INSERT INTO ${this._schema}.panther_users (email, name, password) values ('admin','admin','${hash}');           
            `);
        });
    }
}

module.exports = PrepareForInternalUser;