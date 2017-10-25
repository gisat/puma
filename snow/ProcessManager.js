let hash = require("object-hash");

class ProcessManager {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }

    initProcessPgTable() {
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
        query.push(`PRIMARY KEY (id),`);
        query.push(`UNIQUE (key)`);
        query.push(`);`);
        return this._pgPool.pool().query(query.join(` `));
    }

    getProcessesById(id) {
        return this.getProcess(id);
    }

    getProcessesByKey(key) {
        return this.getProcess(null, key);
    }

    getProcessesByOwner(owner) {
        return this.getProcess(null, null, owner);
    }

    getProcess(id, key, owner) {
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
            });
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
            return key
        });
    }

    updateProcessById(id, result) {
        return this.updateProcess(id, null, null, result);
    }

    updateProcessByKey(key, result) {
        return this.updateProcess(null, key, null, result);
    }

    updateProcessByOwner(owner, result) {
        return this.updateProcess(null, null, owner, result);
    }

    updateProcess(id, key, owner, result) {
        if (!id && !key && !owner) return Promise.rejected(`no arguments`);
        if (!result) return Promise.rejected(`no result`);
        if (!owner) owner = 'NULL';
        let query = [];
        query.push(`UPDATE processes`);
        query.push(`SET`);
        query.push(`result='${JSON.stringify(result).replace(/'/g, "\\\"")}',`);
        query.push(`ended='${this.getActualSqlDateTime()}'`);
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