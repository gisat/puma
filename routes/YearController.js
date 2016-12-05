var Controller = require('./Controller');
var MongoPeriods = require('../metadata/MongoPeriods');
var MongoPeriod = require('../metadata/MongoPeriod');

class YearController extends Controller {
	constructor(app) {
		super(app, 'year', MongoPeriods, MongoPeriod);
	}
}

module.exports = YearController;