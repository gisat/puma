var Controller = require('./Controller');
var MongoChartConfigurations = require('../visualization/MongoChartConfigurations');
var MongoChartConfiguration = require('../visualization/MongoChartConfiguration');

class ChartCfgController extends Controller {
	constructor(app) {
		super(app, 'chartcfg', MongoChartConfigurations, MongoChartConfiguration);
	}
}

module.exports = ChartCfgController;