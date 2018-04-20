let _ = require('underscore');
let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * This class is responsible for handling the PgScopes created in the database.
 */
class PgScopes extends PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema);
    }

    /**
     * It creates empty scope.
     * @param id {Number}
     */
    create(id) {
        return this._pool.query(`INSERT INTO ${this._schema}.${PgScopes.tableName()} (id) VALUES (${id})`);
    }

    /**
     * There is difference between null and undefined/empty value. Empty value does change the result. null/undefined
     * ignores the property.
     * @param id {Number} Id of the scope to update.
     * @param scope {Object}
     * @param scope.analyticalUnitLevel {Number[]} Ordered ids of the analytical units levels // scope_has_analytical_units table
     * @param scope.periods {Number[]} Ids of the periods relevant for the scope. // scope_has_periods table
     * @param scope.name {String} Name of the scope
     * @param scope.active {Boolean} It is possible to have inactive scope for purposes of preparation.
     */
    update(id, scope) {
        if(!id) {
            throw new Error(
                logger.error(`PgScopes#update Id must be provided.`)
            );
        }
        if(!scope) {
            throw new Error(
                logger.error(`PgScopes#update Updated scope must be provided.`)
            );
        }
        if(scope.analyticalUnitLevel && !_.isArray(scope.analyticalUnitLevel)) {
            throw new Error(
                logger.error(`PgScopes#update Analytical units must be either null or array.`)
            );
        }
        if(scope.periods && !_.isArray(scope.periods)) {
            throw new Error(
                logger.error(`PgScopes#update Periods must be either null or array.`)
            );
        }

        let sql = `BEGIN TRANSACTION; `;
        let changes = [];

        if(scope.name !== null) {
            changes.push(` name = '${name}' `);
        }
        if(scope.active !== null) {
            changes.push(` active = ${scope.active} `);
        }
        if(scope.analyticalUnitLevel !== null) {
            sql += ` DELETE FROM ${this._schema}.${PgScopes.analyticalUnits()} WHERE scope_id = ${id}; `;
            sql += scope.analyticalUnitLevel.map(analyticalUnitLevel =>
                ` INSERT INTO ${this._schema}.${PgScopes.analyticalUnits()} (scope_id, analytical_unit_id) VALUES (${id}, ${analyticalUnitLevel}); `
            );
        }
        if(scope.periods !== null) {
            sql += ` DELETE FROM ${this._schema}.${PgScopes.periods()} WHERE scope_id = ${id}; `;
            sql += scope.periods.map(period =>
                ` INSERT INTO ${this._schema}.${PgScopes.periods()} (scope_id, period_id) VALUES (${id}, ${period}); `
            );
        }

        if(changes.length > 0) {
            sql += `UPDATE ${this._schema}.${PgScopes.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
        }
        sql += `COMMIT; `;

        logger.info(`PgScopes#update SQL: ${sql}`);
        return this._pool.query(sql).catch(err => {
            logger.error(`PgScopes#update ERROR: `, err);
            return this._pool.query(`ROLLBACK`);
        })
    }

    /**
     * It simply deletes row with given ID. Cascading to all relevant tables.
     * @param id {Number}
     * @return {*}
     */
    delete(id) {
        return this._pool.query(`DELETE FROM ${this._schema}.${PgScopes.tableName()} WHERE id = ${id} CASCADE`);
    }

    static tableName() {
        return 'scope';
    }

    static analyticalUnits() {
        return 'scope_has_analytical_unit_level';
    }

    static periods() {
        return 'scope_has_period';
    }
}

module.exports = PgScopes;