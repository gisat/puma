const FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
const FilteredMongoThemes = require('../metadata/FilteredMongoThemes');
const LimitedReadAllController = require('./LimitedReadAllController');
var MongoPeriods = require('../metadata/MongoPeriods');
var MongoPeriod = require('../metadata/MongoPeriod');

class YearController extends LimitedReadAllController {
	constructor(app, pool) {
		super(app, 'year', pool, MongoPeriods, MongoPeriod);
	}

	right(user, method, id){
		let permissions = false;

		return new FilteredMongoThemes({years: {$in: [id]}}, this._connection).json().then(themes => {
			themes.forEach(theme => {
				theme.topics && theme.topics.forEach(topic => {
					if(user.hasPermission('topic', method, topic)){
						permissions = true;
					}
				});
			});

			return new FilteredMongoScopes({years: {$in: [id]}}, this._connection).json()
		}).then(scopes => {
			scopes.forEach(scope => {
				if(user.hasPermission('dataset', method, scope._id)){
					permissions = true;
				}
			});
		});
	}
}

module.exports = YearController;