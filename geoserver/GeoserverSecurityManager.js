const xml2js = require(`xml-js`);
const superagent = require(`superagent`);

class GeoserverSecurityManager {
	constructor() {
		this._geoserverProtocol = "http";
		this._geoserverHost = "localhost";
		this._geoserverPath = "geoserver";
		this._geoserverUser = "admin";
		this._geoserverPassword = "geoserver";
	}

	ensureGeoserverUser(username, password) {
		return this.getUser(username)
			.then((user) => {
				if(!user) {
					return this.createUser({userName: username, password: password, enabled: true});
				}
			})
			.catch((error) => {
				console.log(`Failed to ensure geoserver user account. Error:`, error);
			});
	}

	disableAdvertisedForAllLayers() {
		return Promise.resolve()
			.then(() => {
				return this.getListOfAllGeoserverLayers();
			});
	}

	getListOfAllGeoserverLayers() {
		return superagent
			.get(`${this.getBaseGeoserverRestApiPath()}/layers.json`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.then((result) => {
				return (result.body.layers.layer);
			})
			.then((layers) => {
				return this.getMetadataForLayers(layers);
			})
			.then((layers) => {
				return this.unAdvertiseLayers(layers);
			})
	}

	async getMetadataForLayers(layers) {
		let layersWithMetadata = [];
		for (let layer of layers) {
			layersWithMetadata.push(await this.getMetadataForLayer(layer));
		}
		return layersWithMetadata;
	}

	getMetadataForLayer(layer) {
		return superagent
			.get(layer.href)
			.auth(this._geoserverUser, this._geoserverPassword)
			.then((response) => {
				return response.body.layer;
			});
	}

	async getConfigurationForLayers(layers) {
		let layersWithConfiguration = [];
		for(let layer of layers) {
			layersWithConfiguration.push(await this.getConfigurationForLayer(layer));
		}
		return layersWithConfiguration;
	}

	getConfigurationForLayer(layer) {
		return superagent
			.get(layer.resource.href)
			.auth(this._geoserverUser, this._geoserverPassword)
			.then((response) => {
				return response.body[layer.type === "VECTOR" ? "featureType" : "coverage"]
			});
	}

	async unAdvertiseLayers(layers) {
		for(let layer of layers) {
			await this.unAdvertiseLayer(layer);
		}
	}

	unAdvertiseLayer(layer) {
		return superagent
			.put(layer.resource.href)
			.auth(this._geoserverUser, this._geoserverPassword)
			.send({
				[layer.type === "VECTOR" ? "featureType" : "coverage"]: {
					advertised: false
				}
			})
			.then(() => {
				return true;
			});
	}

	getBaseGeoserverRestApiPath() {
		return `${this._geoserverProtocol}://${this._geoserverHost}/${this._geoserverPath}/rest`
	}

	getUsers() {
		return superagent
			.get(`${this.getBaseGeoserverRestApiPath()}/security/usergroup/users`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.then((response) => {
				return this.xml2json(response.body);
			})
			.then((rawUsers) => {
				return _.map(rawUsers.users.user, (user) => {
					return {
						username: user.userName._text,
						enabled: user.enabled._text
					}
				})
			})
	}

	getUser(userName) {
		return this.getUsers()
			.then((users) => {
				return _.find(users, {username: userName});
			})
	}

	createUser(user) {
		return superagent
			.post(`${this.getBaseGeoserverRestApiPath()}/security/usergroup/users`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.set('Accept', 'application/xml')
			.send(this.json2xml({"org.geoserver.rest.security.xml.JaxbUser": user}))
			.then((response) => {
				if(response.body && Object.keys(response.body).length) {
					return this.xml2json(response.body);
				}
			})
	}

	deleteUser(userName) {
		return superagent
			.delete(`${this.getBaseGeoserverRestApiPath()}/security/usergroup/user/${userName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return this.xml2json(response.body);
			})
	}

	createUserGroup(groupName) {
		return superagent
			.post(`${this.getBaseGeoserverRestApiPath()}/security/usergroup/group/${groupName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return this.xml2json(response.body);
			})
	}

	deleteUserGroup(groupName) {
		return superagent
			.delete(`${this.getBaseGeoserverRestApiPath()}/security/usergroup/group/${groupName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return this.xml2json(response.body);
			})
	}

	createRole(roleName) {
		return superagent
			.post(`${this.getBaseGeoserverRestApiPath()}/security/roles/role/${roleName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return this.xml2json(response.body);
			})
	}

	deleteRole(roleName) {
		return superagent
			.delete(`${this.getBaseGeoserverRestApiPath()}/security/roles/role/${roleName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return this.xml2json(response.body);
			})
	}

	getGroupsForUser(userName) {
		return superagent
			.get(`${this.getBaseGeoserverRestApiPath()}/security/usergroup/user/${userName}/groups`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return this.xml2json(response.body);
			})
	}

	addUserToGroup(userName, groupName) {
		return superagent
			.post(`${this.getBaseGeoserverRestApiPath()}/security/usergroup/user/${userName}/group/${groupName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return true;
			})
	}

	removeUserFromGroup(userName, groupName) {
		return superagent
			.delete(`${this.getBaseGeoserverRestApiPath()}/security/usergroup/user/${userName}/group/${groupName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return true;
			})
	}

	getRolesForUser(userName) {
		return superagent
			.get(`${this.getBaseGeoserverRestApiPath()}/security/roles/user/${userName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return this.xml2json(response.body);
			})
	}

	addRoleToUser(roleName, userName) {
		return superagent
			.post(`${this.getBaseGeoserverRestApiPath()}/security/roles/role/${roleName}/user/${userName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return true;
			})
	}

	removeRoleFromUser(roleName, userName) {
		return superagent
			.delete(`${this.getBaseGeoserverRestApiPath()}/security/roles/role/${roleName}/user/${userName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return true;
			})
	}

	setReadRuleToLayerForUser(layerName, userName) {
		let workspace = layerName.split(`:`)[0];
		layerName = layerName.split(`:`)[1];
		return superagent
			.post(`${this.getBaseGeoserverRestApiPath()}/security/acl/layers`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/json')
			.send({[`${workspace}.${layerName}.r`]: `user_${userName}`})
			.then((response) => {
				return true;
			})
	}

	xml2json(xml) {
		return xml2js.xml2js(xml, {ignoreComment: true, alwaysChildren: true, compact: true, ignoreDeclaration: true, nativeType: true});
	}

	json2xml(json) {
		if(_.isString(json)) {
			json = JSON.parse(json);
		}
		json = {
			_declaration: {
				_attributes: {
					version: `1.0`,
					encoding: `UTF-8`,
					standalone: `yes`
				}
			},
			...json
		};
		return xml2js.js2xml(json, {compact: true, ignoreComment: true, spaces: 4, declarationKey: '_declaration'});
	}
}

module.exports = GeoserverSecurityManager;