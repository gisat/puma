const Migration = require('./Migration');

class AddSession extends Migration {
    constructor(schema){
        super('2_14_AddSession', schema);

        this._schema = schema;
    }

    process(mongo, pool) {
        return pool.query(`
            CREATE TABLE IF NOT EXISTS ${this._schema}."session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
            	"expire" timestamp(6) NOT NULL
            ) WITH (OIDS=FALSE);
            ALTER TABLE ${this._schema}."session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        `);
    }
}

module.exports = AddSession;