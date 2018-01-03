let Promise = require('promise');

class RestDataStore {
	constructor(name) {
		this._name = name;
	}

	name() {
		return Promise.resolve(this._name);
	}
}

module.exports = RestDataStore;