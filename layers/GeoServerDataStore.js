var Promise = require('promise');
var GeoServerWorkspace = require('./GeoServerWorkspace');

class GeoServerDataStore {
	constructor(name, workspace, host, port, database, userName, password){
		this._name = name;
		this._workspace = workspace;

		this._host = host;
		this._port = port;
		this._database = database;
		this._userName = userName;
		this._password = password;
	}

	name() {
		return Promise.resolve(this._name);
	}

	connectionParameters() {
		return Promise.resolve({
			host: this._host,
			port: this._port,
			database: this._database,
			user: this._userName,
			passwd: this._password,
			dbtype: 'postgis',
			schema: 'views'
		})
	}

	workspace() {
		return Promise.resolve(this._workspace);
	}

	static example(host, port, database, userName, password) {
		return new GeoServerDataStore('puma_test', GeoServerWorkspace.example(), host, port, database, userName, password);
	}
}

module.exports = GeoServerDataStore;