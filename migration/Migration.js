var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

var PgPool = require('../postgresql/PgPool');
var DatabaseSchema = require('../postgresql/DatabaseSchema');
var MongoClient = require('mongodb').MongoClient;

class Migration {
	constructor(name, schema) {
		this._name = name;
		this._connectionPool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});
		this._pool = this._connectionPool.pool();
		this.schema = schema || config.postgreSqlSchema;
	}

	run() {
		logger.info('Migration#run Migration with name ', this._name, ' is run');
		var exists;
		var self = this;
		return this.verify().then(function (pExists) {
			exists = pExists;
		}).then(function () {
			return new DatabaseSchema(self._connectionPool, self.schema).create()
		}).then(function () {
			return MongoClient.connect(config.mongoConnString);
		}).then(function (client) {
			if (!exists) {
				return self.process(client, self._connectionPool).then(function () {
					logger.info('Migration#run Success');
					self.save();
				});
			} else {
				return true;
			}
		}).catch(function (error) {
			logger.error('Migration#run Error', error);
		});
	}

	process(mongoDatabase, pool) {
	}

	verify() {
		logger.info('Migration#verify Started verification');
		return this._pool.query('select * from ' + this.schema + '.migration where name = \'' + this._name + '\'').then(function (results) {
			logger.info('Migration#verify Results: ', results.rows);
			return results.rows.length > 0;
		}).catch(function (error) {
			logger.error('Migration#verify Error: ', error);
		});
	}

	save() {
		logger.info('Migration#save Started Saving');
		return this._pool.query('insert into ' + this.schema + '.migration (name) values ($1)', [this._name]).then(function(results){
			logger.info('Migration#save Results: ', results.rows);
			return true;
		}).catch(function (error) {
			logger.error('Migration#verify Error: ', error);
		});
	}
}

module.exports = Migration;