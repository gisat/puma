var Controller = require('./Controller');
var MongoChartConfigurations = require('../visualization/MongoChartConfigurations');
var MongoChartConfiguration = require('../visualization/MongoChartConfiguration');

class ChartCfgController extends Controller {
	constructor(app, pool) {
		super(app, 'chartcfg', pool, MongoChartConfigurations, MongoChartConfiguration);
	}
}

module.exports = ChartCfgController;