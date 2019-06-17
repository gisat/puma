var Promise = require('promise');

class PgCachedRow {
    constructor(data, pgPool, schema, table, idColumn) {
        this._data = data;
        this._pgPool = pgPool;
        this._idColumn = idColumn;

        this.schema = schema;
        this._table = table;
    }

    id() {
        return this.column(this._idColumn);
    }

    column(name) {
        return Promise.resolve(this._data[name]);
    }

    add(name, value) {
        return this.id().then(id => {
            var sql = `UPDATE ${this.schema}.${this._table} SET ${name} = ${value} WHERE ${this._idColumn}=${id}`;

            return this._pgPool.pool().query(sql);
        });
    }
}

module.exports = PgCachedRow;