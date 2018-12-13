let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * Representation of the templates for the analytical units.
 * @augments PgCollection
 */
class PgAnalyticalUnitTemplates extends PgCollection {
    constructor(pool, schema) {
        super(pool, schema, PgAnalyticalUnitTemplates.tableName());
    }

    /**
     * @inheritDoc
     */
    create(id, userId){
        return super.create(id, userId).then(()=>{
            return this._pgPool.query(`INSERT INTO ${this._pgSchema}.${PgAnalyticalUnitTemplates.tableName()} (id) VALUES (${id})`);
        });
    }

    /**
     *
     * @param id {Number} id of the analytical unit template to update
     * @param analyticalUnitTemplate {Object}
     * @param analyticalUnitTemplate.name {String} New name of the analytical unit_template
     * @param userId {Number} If of the user requesting update
     */
    update(id, analyticalUnitTemplate, userId) {
        return super.update(id, analyticalUnitTemplate, userId).then(() => {
            if(analyticalUnitTemplate.name !== null) {
                let sql = `BEGIN TRANSACTION; `;
                let changes = [];

                if(analyticalUnitTemplate.name !== null) {
                    changes.push(` name = '${analyticalUnitTemplate.name}' `);
                }

                sql += `UPDATE ${this._pgSchema}.${PgAnalyticalUnitTemplates.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
                sql += `COMMIT; `;

                logger.info(`PgPeriods#update SQL: ${sql}`);
                return this._pgPool.query(sql)
            }
        }).catch(err => {
            logger.error(`PgPeriods#update ERROR: `, err);
            return this._pgPool.query(`ROLLBACK`);
        });
    }

    /**
     * @inheritDoc
     */
    delete(id, userId) {
        return super.delete(id, userId).then(() => {
            return this._pgPool.query(`DELETE FROM ${this._pgSchema}.${PgAnalyticalUnitTemplates.tableName()} WHERE id = ${id} CASCADE;`);
        });
    }

    static tableName() {
        return 'analytical_unit_template';
    }
}

module.exports = PgAnalyticalUnitTemplates;