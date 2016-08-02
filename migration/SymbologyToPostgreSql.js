var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

var PgStyles = require('../styles/PgStyles');
var RestStyle = require('../styles/RestStyle');

var Migration = require('./Migration');

class SymbologyToPostgreSql extends Migration {
	constructor() {
		super('symbologyToPostgreSql');
	}

	process(mongoDatabase, pool){
		logger.info('SymbologyToPostgreSql#process Started processing.');

		return mongoDatabase.collection('symbology').find().toArray()
			.then(function (symbologies) {
				var styles = new PgStyles(pool, config.postgreSqlSchema);
				var promises = [];
				symbologies.forEach(function (symbology) {
					symbology.source = 'geoserver';
					promises.push(
						styles.add(new RestStyle(symbology._id, symbology, 1))
					);
				});

				return Promise.all(promises);
			}).catch(function (error) {
				logger.error('symbologyToPostgreSql#run Error: ', error);
			});
	}
}

module.exports = SymbologyToPostgreSql;