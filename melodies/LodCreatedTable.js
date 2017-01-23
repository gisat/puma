var LodAdministrativeUnits = require('./LodAdministrativeUnits');
var LodLandUse = require('./LodLandUse');
var LodEnhancedTable = require('./LodEnhancedTable');

class LodCreatedTable {
    constructor(pgPool, schema, table, place) {
        this.schema = schema;
        this._table = table;

        this._pgPool = pgPool;
        this._units = new LodAdministrativeUnits(place);
        this._landUse = new LodLandUse(pgPool, schema, table, units);
        this._enhancedTable = new LodEnhancedTable(pgPool, schema, table, 'fid');
    }

    create() {
        var sql = `CREATE TABLE ${this.schema}.${this._table} (
            fid SERIAL,        
            lu text,
            area text,
            the_geom geometry(MultiPolygon, 4326)
        )`;

        return this._pgPool.pool().query(sql).then(() => {
            return this._landUse.insert();
        }).then(() => {
            return this._enhancedTable.update();
        });
    }
}

module.exports = LodCreatedTable;