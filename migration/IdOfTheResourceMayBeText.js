let Migration = require('./Migration');

let config = require('../config');

class IdOfTheResourceMayBeText extends Migration {
	constructor() {
		super('IdOfTheResourceMayBeText');
	}

	process(mongo, pool) {
		return pool.query(`ALTER TABLE ${config.postgreSqlSchema}.permissions ALTER COLUMN resource_id TYPE text`).then(() => {
			return pool.query(`ALTER TABLE ${config.postgreSqlSchema}.permissions ALTER COLUMN resource_id TYPE text`);
		});
	}
}

module.exports = IdOfTheResourceMayBeText;