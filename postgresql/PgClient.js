const { Client } = require('pg');

const config = require('../config');

class PgClient {
	constructor() {
	}

	getClient(superuser) {
		if(superuser && config.pgConfig.superuser) {
			return this.getSuperUser();
		} else {
			return this.getNormal();
		}
	}

	getNormal() {
		return new Client(config.pgConfig.normal);
	}

	getSuperUser() {
		return new Client(config.pgConfig.superuser);
	}
}

module.exports = PgClient;