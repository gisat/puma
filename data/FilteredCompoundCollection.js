var _ = require('underscore');
var Promise = require('promise');

class FilteredCompoundCollection {
	constructor(collections) {
		this._collections = collections;
	}

	read() {
		var promises = [];

		this._collections.forEach(function(collection){
			promises.push(collection.read());
		});

		return Promise.all(promises).then(function(responses){
			// TODO: make sure it works.
			return _.union.apply(_, responses);
		});
	}
}

module.exports = FilteredCompoundCollection;