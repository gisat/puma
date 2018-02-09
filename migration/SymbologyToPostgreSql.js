var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

var PgStyles = require('../styles/PgStyles');
var RestStyle = require('../styles/RestStyle');

var Migration = require('./Migration');

class SymbologyToPostgreSql extends Migration {
	constructor(schema) {
		super('symbologyToPostgreSql', schema);

		this._schema = schema;
	}

	process(mongoDatabase, pool){
		logger.info('SymbologyToPostgreSql#process Started processing.');

		return mongoDatabase.collection('symbology').find().toArray()
			.then((symbologies) => {
				var styles = new PgStyles(pool, this._schema);
				var promises = [];
				symbologies.forEach(function (symbology) {
					symbology.source = 'geoserver';
					symbology.id = symbology._id;
					if(!symbology.definition) {
						symbology.definition = {rules: []}
					}
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