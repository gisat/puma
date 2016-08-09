var superagent = require('superagent');

class GeoServerWorkspaces {
	constructor(url, userName, password){
		this._url = url;
		this._userName = userName;
		this._password = password;
	}

	create(workspace) {
		var self = this;
		return workspace.name().then(function(name){
			return superagent
				.post(self._url + '/rest/workspaces')
				.auth(self._userName, self._password)
				.set('Accept', '*/*')
				.set('Content-Type', 'application/json; charset=utf-8')
				.send({
					workspace: {
						name: name
					}
				})
		});
	}

	remove(name) {
		return superagent
			.delete(this._url + '/rest/workspaces/' + name)
			.auth(this._userName, this._password)
			.set('Accept', '*/*')
			.set('Content-Type', 'application/json; charset=utf-8')
			.send()
	}
}

module.exports = GeoServerWorkspaces;