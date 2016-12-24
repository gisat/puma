let childProcess = require('pn/child_process');
let config = require('../config');

class PgTable {
	constructor(tableName) {
		this.tableName = tableName;
	}

	asSql() {
		let command = `pg_dump -t '${this.tableName}' --schema-only -U ${config.pgDataUser} ${config.pgDataDatabase}`;
		return childProcess.exec(command).promise.then(results => {
			console.log(results);
		});
	}
}

module.exports = PgTable;