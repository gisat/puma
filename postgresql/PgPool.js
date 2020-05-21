const { Pool } = require('pg');

const config = require('../config');

class PgPool {
	constructor() {
	}

	getPool(superuser) {
		if(superuser && config.pgConfig.superuser) {
			return this.getSuperUser();
		} else {
			return this.getNormal();
		}
	}

	getNormal() {
		return new Pool(config.pgConfig.normal);
	}

	getSuperUser() {
		return new Pool(config.pgConfig.superuser);
	}
}

module.exports = PgPool;