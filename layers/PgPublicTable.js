var logger = require('../common/Logger').applicationWideLogger;

/**
 * Class representing table in pg public schema
 */
class PgPublicTable {
    constructor(pool, layer) {
        this._pgPool = pool;
        this._layer = layer;
    }

    /**
     * Insert record to the table
     * @param data {Object}
     */
    insertRecord(data) {
        var layer = this._layer.split(":")[1];

        // TODO sql injection
        let sql = `INSERT INTO public."${layer}"` +
            ` values(DEFAULT, ST_GeomFromText('` + data.geometry + `', 3035), -1, 0, '` + data.name + `')` ;
        logger.info('ImportTable#insert sql', sql);
        return this.query(sql);
    }

    deleteRecord(){
        //todo delete record
    }

    query(sql){
        return this._pgPool.pool().query(sql)
    }
}

module.exports = PgPublicTable;