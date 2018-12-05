const superagent = require(`superagent`);

const config = require(`../../config`);

class GeoserverProxy {
	constructor(pgPool, pgSchema, mongo) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
		this._mongo = mongo;

		this._protocol = `http`;
		this._host = `localhost`;
		this._path = `geoserver`;

		this._username = `admin`;
		this._password = `geoserver`;

		this._dataLayerPermissionCache = {};
	}

	async proxy(request, response) {
		let url = request.url;
		let headers = request.headers;
		let method = request.method;
		let user = request.session.user;
		let query = request.query;
		let body = request.body;
		let rawBody = request.rawBody;

		let requestedLayers = [];
		_.each(query, (value, property) => {
			if(property.toLowerCase().includes(`layer`)) {
				requestedLayers.push(value.split(`,`));
				requestedLayers = _.flatten(requestedLayers);
			}
		});

		let allowedLayers = [];
		if(requestedLayers.length) {
			if(!this._dataLayerPermissionCache[user.id] || this._dataLayerPermissionCache[user.id].update < (Date.now() - (1000 * 60))) {
				console.log(`#### Checking data layer permissions for user with id ${user.id}`);
				let allowedPlaceIds = _.uniq(_.map(_.filter(_.flatten([...user.permissions, ..._.map(user.groups, (group) => { return group.permissions})]), {resourceType: `location`, permission: `GET`}), (permission) => { return Number(permission.resourceId)}));
				await this._mongo
					.collection(`layerref`)
					.find({location: {$in: allowedPlaceIds}})
					.toArray()
					.then((layerrefs) => {
						_.each(layerrefs, (layerref) => {
							allowedLayers.push(layerref.layer);
							if(layerref.isData === false) {
								allowedLayers.push(`panther:layer_${layerref._id}`);
							}
						});
						allowedLayers = _.uniq(allowedLayers);
						this._dataLayerPermissionCache[user.id] = {
							update: Date.now(),
							allowedLayers
						}
					});
			} else {
				allowedLayers = this._dataLayerPermissionCache[user.id].allowedLayers;
			}
		}

		let geoserverRequest;

		if(!requestedLayers.length || !_.difference(requestedLayers, allowedLayers).length) {
			let geoserverUrl = `${this._protocol}://${this._host}${url}`;
			if(method.toLowerCase() === `get`) {
				geoserverRequest = superagent.get(geoserverUrl)
			} else if(method.toLowerCase() === `post`) {
				geoserverRequest = superagent.post(geoserverUrl)
			} else if(method.toLowerCase() === `put`) {
				geoserverRequest = superagent.put(geoserverUrl)
			} else if(method.toLowerCase() === `delete`) {
				geoserverRequest = superagent.delete(geoserverUrl)
			}

			_.each(headers, (value, property) => {
				if(property.toLowerCase() === `content-type` || property.toLowerCase() === `accept`) {
					geoserverRequest = geoserverRequest.set(property, value);
				}
			});
		}

		if(geoserverRequest) {
			geoserverRequest = geoserverRequest.auth(this._username, this._password);

			if(method.toLowerCase() !== `get`) {
				geoserverRequest = geoserverRequest.send(rawBody);
			}

			geoserverRequest
				.then((geoserverResponse) => {
					_.each(geoserverResponse.headers, (value, property) => {
						if(property.toLowerCase() === `content-type` || property.toLowerCase() === `accept`) {
							response.setHeader(property, value);
						}
					});
					response.status(geoserverResponse.status).send(geoserverResponse.body);
				})
				.catch((geoserverError) => {
					response.status(geoserverError.status).send(geoserverError.body);
					console.log(`#### error`, geoserverError);
				})
		} else {
			response.status(500).send(`not found, not implemented or user has no permission`);
		}
	}
}

module.exports = GeoserverProxy;