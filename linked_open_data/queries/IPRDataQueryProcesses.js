class IPRDataQueryProcesses {
    constructor(pool) {
        this._pool = pool;
        this._initIprDataQueryProcesses();
    }
    
    _initIprDataQueryProcesses() {
        this._createIprDataQueryProcessesTable().then(() => {
            return this._clearIncompleteProcesses()
        }).catch((error) => {
            console.log(error);
        });
    }
    
    _createIprDataQueryProcessesTable() {
        let sql = `CREATE TABLE IF NOT EXISTS ipr_query_processes (
                          hash VARCHAR(50) PRIMARY KEY ,
                          results json,
                          state VARCHAR(10)
                        );`;
        return this._pool.pool().query(sql);
    }
    
    _clearIncompleteProcesses() {
        let sql = `DELETE FROM ipr_query_processes WHERE state != 'ok';`;
        return this._pool.pool().query(sql);
    }
    
    getExistingProcess(hash) {
        let sql = `SELECT * FROM ipr_query_processes WHERE hash = '${hash}';`;
        return this._pool.pool().query(sql);
    }
    
    updateExistingProcess(hash, results, state) {
        let sql = `UPDATE ipr_query_processes SET results='${JSON.stringify(results)}', state='${state}' WHERE hash='${hash}';`;
        return this._pool.pool().query(sql);
    }
    
    createNewProcess(hash, results, state) {
        let sql = `INSERT INTO ipr_query_processes VALUES ('${hash}', '${JSON.stringify(results)}', '${state}');`;
        return this._pool.pool().query(sql);
    }
}

module.exports = IPRDataQueryProcesses;