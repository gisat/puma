let hash = require("object-hash");

class ProcessManager {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }

    static initProcessPgTable(pgPool) {
        let query = [];
        query.push(`CREATE TABLE IF NOT EXISTS processes`);
        query.push(`(`);
        query.push(`id serial,`);
        query.push(`key varchar(40) not null,`);
        query.push(`owner integer,`);
        query.push(`started timestamp,`);
        query.push(`ended timestamp,`);
        query.push(`request json not null,`);
        query.push(`uri text,`);
        query.push(`result json,`);
        query.push(`other json,`);
        query.push(`error boolean,`);
        query.push(`PRIMARY KEY (id),`);
        query.push(`UNIQUE (key)`);
        query.push(`);`);
        return pgPool.query(query.join(` `));
    }

    getProcessesById(id, remove) {
        return this.getProcesses(id, null, null, remove);
    }

    getProcessesByKey(key, remove) {
        return this.getProcesses(null, key, null, remove);
    }

    getProcessesByOwner(owner, remove) {
        return this.getProcesses(null, null, owner, remove);
    }

    getProcesses(id, key, owner, remove) {
        if (!id && !key && !owner) return Promise.rejected(`no arguments`);

        let query = [];
        query.push(`SELECT * FROM processes`);
        query.push(`WHERE`);

        if (id) {
            query.push(`id=${id}`);
        } else if (key) {
            query.push(`key='${key}'`);
        } else {
            query.push(`owner=${owner}`);
        }

        query.push(`;`);
        return this._pgPool.pool().query(query.join(` `))
            .then(result => {
                return result.rows;
            })
            .then((processes) => {
                processes.forEach((process) => {
                    if(process.error || remove) {
                        this.removeProcessByKey(process.key);
                    }
                });
            })
    }

    createProcess(owner, request, uri, other) {
        if (!request) return Promise.rejected(`no arguments`);
        if (!other) other = {};
        if (!owner) owner = 'NULL';
        if (!uri) uri = '';

        let key = this.getProcessKey(owner, request, other);
        let query = [];
        query.push(`INSERT INTO processes`);
        query.push(`(key, owner, started, request, uri, other)`);
        query.push(`VALUES (`);
        query.push(`'${key}',`);
        query.push(`${owner},`);
        query.push(`'${this.getActualSqlDateTime()}',`);
        query.push(`'${JSON.stringify(request).replace(/'/g, "\\\"")}',`);
        query.push(`'${uri}',`);
        query.push(`'${JSON.stringify(other).replace(/'/g, "\\\"")}'`);
        query.push(`);`);
        return this._pgPool.pool().query(query.join(` `)).then(() => {
            return this.getProcessesByKey(key);
        });
    }

    updateProcessById(id, result, error) {
        return this.updateProcess(id, null, null, result, error);
    }

    updateProcessByKey(key, result, error) {
        return this.updateProcess(null, key, null, result, error);
    }

    updateProcessByOwner(owner, result, error) {
        return this.updateProcess(null, null, owner, result, error);
    }

    updateProcess(id, key, owner, result, error) {
        if (!id && !key && !owner) return Promise.rejected(`no arguments`);
        if (!result) return Promise.rejected(`no result`);
        if (!owner) owner = 'NULL';

        error = error ? `TRUE` : `FALSE`;

        let query = [];
        query.push(`UPDATE processes`);
        query.push(`SET`);
        query.push(`result='${JSON.stringify(result).replace(/'/g, "\\\"")}',`);
        query.push(`ended='${this.getActualSqlDateTime()}',`);
        query.push(`error=${error}`);
        query.push(`WHERE`);

        if (id) {
            query.push(`id=${id}`);
        } else if (key) {
            query.push(`key='${key}'`);
        } else {
            query.push(`owner=${owner}`);
        }

        query.push(`AND`);
        query.push(`(SELECT count(*) FROM processes WHERE`);

        if (id) {
            query.push(`id=${id}`);
        } else if (key) {
            query.push(`key='${key}'`);
        } else {
            query.push(`owner=${owner}`);
        }

        query.push(`) = 1;`);

        return this._pgPool.pool().query(query.join(` `))
            .then((result) => {
                if(!result.rowCount) throw new Error(`probably more than one process, use key as identification`);
            });
    }

    removeProcessById(id) {
        return this.removeProcess(id);
    }

    removeProcessByKey(key) {
        return this.removeProcess(null, key);
    }

    removeProcessByOwner(owner) {
        return this.removeProcess(null, null, owner);
    }

    removeProcess(id, key, owner) {
        if (!id && !key && !owner) return Promise.rejected(`no arguments`);

        let query = [];
        query.push(`DELETE FROM processes`);
        query.push(`WHERE`);

        if (id) {
            query.push(`id=${id}`);
        } else if (key) {
            query.push(`key='${key}'`);
        } else {
            query.push(`owner=${owner}`);
        }

        query.push(`AND`);
        query.push(`(SELECT count(*) FROM processes WHERE`);

        if (id) {
            query.push(`id=${id}`);
        } else if (key) {
            query.push(`key='${key}'`);
        } else {
            query.push(`owner=${owner}`);
        }

        query.push(`) = 1;`);

        return this._pgPool.pool().query(query.join(` `))
            .then((result) => {
                if(!result.rowCount) throw new Error(`probably more than one process, use key as identification`);
            });
    }

    getActualSqlDateTime() {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    getProcessKey(owner, request, other) {
        if (!other) other = {};
        if (!owner) owner = 'NULL';
        return hash({owner: owner, request: request, other: other});
    }
}

module.exports = ProcessManager;