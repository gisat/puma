var Promise = require('promise');

var GeoServerWorkspace = require('./GeoServerWorkspace');
var GeoServerDataStore = require('./GeoServerDataStore');
let RestWorkspace = require('./RestWorkspace');

class RestLayer {
	constructor(name, workspace, dataStore) {
		this._name = name;

		this._workspace = workspace;
		this._dataStore = dataStore;
	}

	workspace() {
		return Promise.resolve(new RestWorkspace(this._workspace));
	}

	dataStore() {
		return Promise.resolve(this._dataStore);
	}

	name() {
		return Promise.resolve(this._name)
	}

	static example(host, port, database, userName, password) {
		var workspace = GeoServerWorkspace.example();
		var dataStore = GeoServerDataStore.example(host, port, database, userName, password);
		return new RestLayer('name', workspace, dataStore);
	}
}

module.exports = RestLayer;