var Promise = require('promise');

class PgCachedLayerRow {
    constructor(data, pgPool, idColumn) {
        this._data = data;
        this._pgPool = pgPool;
        this._idColumn = idColumn;
    }

    id() {
        return this.column(this._idColumn);
    }

    column(name) {
        return Promise.resolve(this._data[name]);
    }

    add(name, value) {


        var sql = `UPDATE`;
    }
}

module.exports = PgCachedLayerRow;