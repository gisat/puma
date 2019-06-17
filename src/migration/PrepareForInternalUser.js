let bcrypt = require('bcrypt');

class PrepareForInternalUser {
    constructor(pool, schema) {
        this._schema = schema;
        this._pool = pool;
    }

    process() {
        return bcrypt.hash('admin', 10).then(hash => {
            return this._pool.query(`
                INSERT INTO ${this._schema}.panther_users (email, name, password) values ('admin','admin','${hash}');           
            `);
        });
    }
}

module.exports = PrepareForInternalUser;