let Migration = require('./Migration');

class IdOfTheResourceMayBeText extends Migration {
	constructor(schema) {
		super('IdOfTheResourceMayBeText', schema);

		this._schema = schema;
	}

	process(mongo, pool) {
		return pool.query(`ALTER TABLE ${this._schema}.permissions ALTER COLUMN resource_id TYPE text`).then(() => {
			return pool.query(`ALTER TABLE ${this._schema}.group_permissions ALTER COLUMN resource_id TYPE text`);
		});
	}
}

module.exports = IdOfTheResourceMayBeText;