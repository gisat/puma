class PgTransaction {
    constructor(pgPool) {
        this._pool = pgPool;
    }

    start() {
        return this._pool.query("BEGIN TRANSACTION;");
    }

    end() {
        return this._pool.query("COMMIT TRANSACTION");
    }

    rollback() {
        return this._pool.query("ROLLBACK TRANSACTION;");
    }
}

module.exports = PgTransaction;