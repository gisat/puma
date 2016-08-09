var Promise = require('promise');

class GeoServerWorkspace {
	constructor(name){
		this._name = name;
	}

	name() {
		return Promise.resolve(this._name);
	}

	static example() {
		return new GeoServerWorkspace('test_name');
	}
}

module.exports = GeoServerWorkspace;