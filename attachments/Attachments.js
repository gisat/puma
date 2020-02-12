let fs = require(`fs`);

class Attachments {
	constructor(pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
	}

	getAttachment(key) {
		return Promise
			.resolve()
			.then(() => {
				if (!key) {
					throw new Error(`missing key`);
				}
			})
			.then(() => {
				return this.getAttachmentMetadata(key);
			})
	}

	getAttachmentMetadata(key) {
		return this._pgPool
			.query(`SELECT * FROM "${this._pgSchema}"."attachments" WHERE key = '${key}'`)
			.then((pgResult) => {
				if(pgResult.rows.length) {
					return pgResult.rows[0];
				} else {
					throw new Error(`no attachment found`);
				}
			})
	}
}

module.exports = Attachments;