let Migration = require('./Migration');

class AddAuditInformation extends Migration {
    constructor(schema) {
        super('AddCustomInfoToWms', schema);

        this._schema = schema;
    }

    process(mongo, pool) {
        return pool.query(`
            CREATE TABLE ${this.schema}.audit (
                id SERIAL,
                action text,
                userId number 
            );         
        `);
    }
}

module.exports = AddAuditInformation;