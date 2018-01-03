let childProcess = require('pn/child_process');
let config = require('../config');

class PgTable {
	constructor(tableName) {
		this.tableName = tableName;
	}

	asSql() {
		let command = `pg_dump -t '${this.tableName}' -U ${config.pgDataUser} ${config.pgDataDatabase}`;
		return childProcess.exec(command).promise.then(results => {
			return results.stdout;
		});
	}
}

module.exports = PgTable;