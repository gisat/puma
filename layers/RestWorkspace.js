let Promise = require('promise');

class RestWorkspace {
	constructor(name) {
		this._name = name;
	}

	name(){
		return Promise.resolve(this._name);
	}
}

module.exports = RestWorkspace;