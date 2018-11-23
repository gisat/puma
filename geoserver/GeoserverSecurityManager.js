const xml2js = require(`xml-js`);
const superagent = require(`superagent`);

const PgUsers = require(`../security/PgUsers`);
const PgGroups = require(`../security/PgGroups`);

class GeoserverSecurityManager {
	constructor(mongo, pgPool, pgSchema) {
		this._geoserverProtocol = "http";
		this._geoserverHost = "localhost";
		this._geoserverPath = "geoserver";
		this._geoserverUser = "admin";
		this._geoserverPassword = "geoserver";

		this._mongo = mongo;
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;

		this._pgUsers = new PgUsers(this._pgPool, this._pgSchema);
		this._pgGroups = new PgGroups(this._pgPool, this._pgSchema);
	}

	// todo
	// geoserver ma v tehle oblasti docela slusny diry, spousta veci nefunguje, spousta funguje jinak nez je v dokumentaci, na nektere veci ani dokumentace neni
	//
	// uzivatelska a jina jmena maji problemy se specialnimi znaky, takze uzivatelske jmeno ve tvaru emailu bylo problem a muselo byt upraveno (nezadouci znaky jsou nahrazeny podtrzitkem)
	//
	// skupiny nejdou pouzit protoze geoserver nema rest api na prirazovani roli ke skupinam, takze aktualne skupiny supluji role s prefixem group_ (melo by to pro nase potreby stacit)
	// mozna i rest api ma, ale v dokumentaci uvedene neni a nepovedlo se mi cesty ani odhadnout
	//
	// aby bylo mozne pres rest vytvaret nove uzivatel je nutne mit nastavenou systemovou promenou GEOSERVER_XSTREAM_WHITELIST=org.geoserver.rest.security.xml.JaxbUser
	// a je potreba v payloadu posilanem na server nastavit property z "user" na "org.geoserver.rest.security.xml.JaxbUser"
	//
	// nektere endpointy zvladaji json, nektere ne i kdyz podle dokumentac by meli, vetsinou jsem to vyresil prevodem xml2js a obracene a zatim to funguje, ale je treba s tim pocitat

	setDataRulesForGroupByGroupId(groupId) {
		return this._pgGroups
			.byId(groupId)
			.then((pantherGroup) => {
				return this.setDataRulesForGroup(pantherGroup);
			});
	}

	setDataRulesForGroup(pantherGroup) {
		let groupName = pantherGroup.name;

		let groupRole = `group_${groupName}`;

		return this.ensureRole(groupRole)
			.then(() => {
				let placeIds = _.uniq(_.compact(_.map(
					_.filter(
						pantherGroup.permissions,
						{resourceType: `location`, permission: `GET`}
					),
					(permission) => {
						return Number(permission.resourceId);
					}
				)));

				return this.getDataLayersFromLayerRefsByFilter({location: {'$in': placeIds}});
			})
			.then((dataLayers) => {
				return this.getDataRules()
					.then((dataRules) => {
						return [dataLayers, dataRules];
					})
			})
			.then(async ([dataLayers, dataRules]) => {
				for(let dataLayerIdentificator of dataLayers) {
					let workspace = dataLayerIdentificator.split(`:`)[0];
					let layerName = dataLayerIdentificator.split(`:`)[1];

					let rule = `${workspace}.${layerName}.r`;
					let dataRuleExists = dataRules.hasOwnProperty(rule);

					let groupRole = `group_${groupName}`;

					if(groupName === `guest`) {
						groupRole = `ROLE_ANONYMOUS`;
					}

					if(!dataRuleExists) {
						await this.setReadRuleToLayerForRole(dataLayerIdentificator, groupRole);
					} else {
						let roles = dataRules[rule].split(`,`);
						if(!roles.includes(groupRole)) {
							await this.updateExistingRule(rule, [...roles, groupRole].join(`,`));
						}
					}
				}
			});
	}

	setDataRulesForUserByUserId(userId) {
		return this._pgUsers
			.byId(userId)
			.then((pantherUser) => {
				return this.setDataRulesForUser(pantherUser);
			})
	}

	setDataRulesForUser(pantherUser) {
		let geoserverUserName = this.replaceNonAlphaNumericCharacters(pantherUser._email);
		let userPermissions = _.filter(pantherUser.permissions, {permission: "GET"});
		let groupPermissions = _.filter(_.compact(_.flatten(_.map(pantherUser.groups, (group) => {
			return group.permissions;
		}))), {permission: "GET"});

		let isUserAdmin = !!(_.find(pantherUser.groups, {name: `admin`}));

		let overalPermissions = _.concat(userPermissions, groupPermissions);

		let placeIds = _.uniq(_.compact(_.map(overalPermissions, (permission) => {
			return permission.resourceType === "location" && permission.resourceId && Number(permission.resourceId);
		})));

		return this.getDataLayersFromLayerRefsByFilter({location: {'$in': placeIds}})
			.then((dataLayers) => {
				return this.getDataRules()
					.then((dataRules) => {
						return [dataLayers, dataRules];
					})
			})
			.then(async ([dataLayers, dataRules]) => {
				for(let dataLayerIdentificator of dataLayers) {
					let workspace = dataLayerIdentificator.split(`:`)[0];
					let layerName = dataLayerIdentificator.split(`:`)[1];

					let rule = `${workspace}.${layerName}.r`;
					let dataRuleExists = dataRules.hasOwnProperty(rule);

					if(!dataRuleExists) {
						await this.setReadRuleToLayerForRole(dataLayerIdentificator, `user_${geoserverUserName}`);
					} else {
						let roles = dataRules[rule].split(`,`);
						if(!roles.includes(`user_${geoserverUserName}`)) {
							await this.updateExistingRule(rule, [...roles, `user_${geoserverUserName}`].join(`,`));
						}
					}
				}
				return [dataLayers, dataRules];
			})
			.then(([dataLayers, dataRules]) => {
				if(isUserAdmin) {
					let adminReadRule = "*.*.r";

					if(dataRules.hasOwnProperty(adminReadRule)) {
						let adminReadRuleRoles = dataRules[adminReadRule].split(`,`);

						if(!adminReadRuleRoles.includes(`user_${geoserverUserName}`)) {
							return this.updateExistingRule(adminReadRule, [...adminReadRuleRoles, `user_${geoserverUserName}`].join(`,`));
						}
					}
				}
			})
			.catch((error) => {
				console.log(`Failed to data layers rules for user ${pantherUser._email}. Error:`, error);
			});
	}

	getDataLayersFromLayerRefsByFilter(filter) {
		return this._mongo
			.collection(`layerref`)
			.find(filter)
			.toArray()
			.then((mongoResults) => {
				return _.uniq(_.compact(_.map(mongoResults, (result) => {
					return result.layer;
				})))
			});
	}

	ensureSecurityRulesForUser(pantherUser, password) {
		return this.ensureUser(pantherUser._email, password)
			.then(() => {
				return this.ensureSecurityRolesForUser(pantherUser);
			})
			.then(() => {
				// return this.ensureUserGroupsForUser(pantherUser);
			})
			.then(() => {
				// return this.ensureUserRelationToUserGroups(pantherUser);
			})
			.then(() => {
				return this.ensureUserRelationToRoles(pantherUser);
			})
			.then(() => {
				// return this.ensureUserGroupsRelationToRoles(pantherUser);
			})
			.catch((error) => {
				console.log(`Failed to ensure geoserver user account. Error:`, error);
			});
	}

	ensureUserGroupsRelationToRoles(pantherUser) {
		let userName = pantherUser._email;
		return this.getGroupsForUser(userName)
			.then(async (groups) => {
				for(let group of groups) {
					let groupRoleName = `group_${group}`;
					await this.getRolesForGroup(group)
						.then((groupRoles) => {

						})
				}
			});
	}

	ensureUserRelationToRoles(pantherUser) {
		let userName = this.replaceNonAlphaNumericCharacters(pantherUser._email);

		return this.getRolesForUser(userName)
			.then(async (roles) => {
				let roleName = `user_${userName}`;

				if(!roles.includes(roleName)) {
					await this.addRoleToUser(roleName, userName);
				}

				for(let group of pantherUser.groups) {
					let groupRoleName = `group_${group.name}`;

					if(!roles.includes(groupRoleName)) {
						await this.addRoleToUser(groupRoleName, userName);
					}
				}
			});
	}

	ensureUserRelationToUserGroups(pantherUser) {
		return this.getGroupsForUser(pantherUser._email)
			.then(async (userGroups) => {
				let difference = _.difference(_.map(pantherUser.groups, 'name'), userGroups);
				for(let userGroup of difference) {
					await this.addUserToGroup(pantherUser._email, userGroup);
				}
			});
	}

	ensureUserGroup(groupName) {
		return this.getUserGroups()
			.then((groups) => {
				if(!groups.includes(groupName)) {
					return this.createUserGroup(groupName);
				}
			})
	}

	async ensureUserGroupsForUser(pantherUser) {
		for(let group of pantherUser.groups) {
			await this.ensureUserGroup(group.name);
		}
	}

	async ensureSecurityRolesForUser(pantherUser) {
		await this.ensureRole(`user_${pantherUser._email}`);

		for(let group of pantherUser.groups) {
			await this.ensureRole(`group_${group.name}`)
		}
	}

	ensureUser(username, password) {
		return this.getUser(username)
			.then((user) => {
				if(!user) {
					return this.createUser({userName: this.replaceNonAlphaNumericCharacters(username), password: password, enabled: true});
				}
			})
	}

	ensureRole(roleName) {
		roleName = this.replaceNonAlphaNumericCharacters(roleName);
		return this.getRoles()
			.then((roles) => {
				if(!roles.includes(roleName)) {
					return this.createRole(roleName);
				}
			})
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
				if(_.isObject(rawUsers.users.user) && !_.isArray(rawUsers.users.user)) {
					rawUsers.users.user = [rawUsers.users.user];
				}

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
				return _.find(users, {username: this.replaceNonAlphaNumericCharacters(userName)});
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

	getUserGroups() {
		return superagent
			.get(`${this.getBaseGeoserverRestApiPath()}/security/usergroup/groups`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return this.xml2json(response.body);
			})
			.then((rawUserGroups) => {
				if(_.isObject(rawUserGroups.groups.group) && !_.isArray(rawUserGroups.groups.group)) {
					rawUserGroups.groups.group = [rawUserGroups.groups.group];
				}

				return _.map(rawUserGroups.groups.group, (group) => {
					return group._text;
				})
			})
	}

	createRole(roleName) {
		return superagent
			.post(`${this.getBaseGeoserverRestApiPath()}/security/roles/role/${roleName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				if(response.body && Object.keys(response.body).length) {
					return this.xml2json(response.body);
				}
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
			.then((rawUserGroups) => {
				if(_.isObject(rawUserGroups.groups.group) && !_.isArray(rawUserGroups.groups.group)) {
					rawUserGroups.groups.group = [rawUserGroups.groups.group];
				}

				return _.map(rawUserGroups.groups.group, (group) => {
					return group._text;
				})
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
			.then((rawRoles) => {
				if(_.isObject(rawRoles.roles.role) && !_.isArray(rawRoles.roles.role)) {
					rawRoles.roles.role = [rawRoles.roles.role];
				}

				return _.map(rawRoles.roles.role, (role) => {
					return role._text;
				})
			})
	}

	getRolesForGroup(groupName) {
		return superagent
			.get(`${this.getBaseGeoserverRestApiPath()}/security/roles/user/${userName}`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return this.xml2json(response.body);
			})
			.then((rawRoles) => {
				if(!_.isArray(rawRoles.roles) && _.isObject(rawRoles.roles) && !Object.keys(rawRoles.roles).length) {
					return [];
				} else {
					return _.map(rawRoles.roles, (role) => {
						return role._text;
					});
				}
			})
	}

	getRoles() {
		return superagent
			.get(`${this.getBaseGeoserverRestApiPath()}/security/roles`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/xml')
			.then((response) => {
				return this.xml2json(response.body);
			})
			.then((rawRoles) => {
				return _.map(rawRoles.roles.role, (role) => {
					return role._text;
				})
			});
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

	setReadRuleToLayerForRole(layerName, role) {
		let workspace = layerName.split(`:`)[0];
		layerName = layerName.split(`:`)[1];
		return superagent
			.post(`${this.getBaseGeoserverRestApiPath()}/security/acl/layers`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/json')
			.send({[`${workspace}.${layerName}.r`]: role})
			.then((response) => {
				return true;
			})
	}

	updateExistingRule(rule, roles) {
		return superagent
			.put(`${this.getBaseGeoserverRestApiPath()}/security/acl/layers`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/json')
			.set('Accept', 'application/json')
			.send({[rule]: roles})
			.then((response) => {
				return true;
			})
	}

	getDataRules() {
		return superagent
			.get(`${this.getBaseGeoserverRestApiPath()}/security/acl/layers`)
			.auth(this._geoserverUser, this._geoserverPassword)
			.set('Content-type', 'application/json')
			.set('Accept', 'application/json')
			.then((response) => {
				return response.body;
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

	replaceNonAlphaNumericCharacters(input) {
		return input.replace(/\W+/g, `_`);
	}
}

module.exports = GeoserverSecurityManager;