let Migration = require('./Migration');
let bcrypt = require('bcrypt');

class PrepareForInternalUser extends Migration {
    constructor(schema) {
        super('PrepareForInternalUser', schema);

        this._schema = schema;
    }

    process(mongo, pool) {
        return bcrypt.hash('admin', 10).then(hash => {
            return pool.query(`
                INSERT INTO ${this._schema}.panther_users (email, name, password) values ('admin','admin','${hash}');           
            `);
        });
    }
}

module.exports = PrepareForInternalUser;