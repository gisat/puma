let _ = require(`lodash`);
let fs = require(`fs`);
let {MongoClient} = require(`mongodb`);
let superagent = require('superagent');

let config = require(`../config`);

let logger = require('../common/Logger').applicationWideLogger;
let PgCsvLayer = require('../layers/PgCsvLayer');
let GeoserverImporter = require(`../layers/GeoServerImporter`);
let crud = require(`../rest/crud`);
let PgPermissions = require('../security/PgPermissions');

let MongoLocation = require(`../metadata/MongoLocation`);
let MongoLocations = require(`../metadata/MongoLocations`);
let MongoLayerReference = require(`../layers/MongoLayerReference`);
let MongoLayerReferences = require(`../layers/MongoLayerReferences`);

class ImportController {
	constructor(app, pgPool) {
		app.post('/rest/import/csv', this.csv.bind(this));

		app.post(`/rest/import/layer`, this.layer.bind(this));

		this._app = app;
		this._pgPool = pgPool;
		this.permissions = new PgPermissions(pgPool, config.postgreSqlSchema);

		this._geoserverImporter = new GeoserverImporter(
			`${config.remoteProtocol}://${config.remoteAddress}${config.geoserverPath}`,
			config.geoserverUsername,
			config.geoserverPassword,
			`geonode`,
			`datastore`,
			this._pgPool
		);
	}

	csv(request, response, next) {
		new PgCsvLayer().import(request, this._pgPool).then(function (result, error) {
			response.send(result);
		}).catch(error => {
			response.status(500).send(error);
		});
	}

	layer(request, response, next) {
		request.body.data = JSON.parse(request.body.data);
		let systemName = `au_${Math.random().toString(36).substring(3)}`;
		Promise.resolve().then(() => {
			let pathToFiles = `${config.temporaryDownloadedFilesLocation}${systemName}`;

			fs.mkdirSync(pathToFiles);

			for (let key of (Object.keys(request.files))) {
				fs.renameSync(request.files[key].path, `${pathToFiles}/${systemName}.${key}`);
			}

			return this._geoserverImporter.importLayer(
				{
					type: `vector`,
					systemName: systemName,
					directory: pathToFiles
				},
				true
			)
		}).then(() => {
			return superagent
				.get(`http://localhost/cgi-bin/updatelayers?f=${systemName}&s=datastore&w=geonode&other=removeDeleted`);
		}).then(() => {
			return superagent
				.get(`http://localhost/geoserver/rest/workspaces/geonode/datastores/datastore/featuretypes/${systemName}.json`)
				.auth('admin', 'geoserver');
		}).then(() => {
			if (!request.body.data.place.hasOwnProperty(`dataset`)) {
				request.body.data.place[`dataset`] = request.body.data.scope._id;
			}
			request.body.data.place.active = true;
			if (!request.body.data.place.hasOwnProperty(`_id`)) {
				return new Promise((resolve, reject) => {
					crud.create(`location`, request.body.data.place, {
						userId: request.session.userId,
						isAdmin: response.locals.isAdmin
					}, (err, result) => {
						if (err) {
							reject(new Error("It wasn't possible to create object of type: location by User: " + request.session.userId +
								" With data: " + request.body.data + " Error: " + err));
						} else {
							Promise.all([
								this.permissions.add(request.session.userId, `location`, result._id, "GET"),
								this.permissions.add(request.session.userId, `location`, result._id, "PUT"),
								this.permissions.add(request.session.userId, `location`, result._id, "DELETE")
							]).then(() => {
								resolve(result);
							}).catch((error) => {
								reject(error);
							});
						}
					});
				});
			} else {
				return new Promise((resolve, reject) => {
					crud.update(`location`, object, {
						userId: request.session.userId,
						isAdmin: response.locals.isAdmin
					}, function (err, result) {
						if (err) {
							reject(new Error("It wasn't possible to update object of type: location by User: " + request.session.userId +
								" With data: " + request.body.data + " Error: " + err));
						} else {
							resolve(result);
						}
					});
				});
			}
		}).then((mongoLocation) => {
			return new Promise((resolve, reject) => {
				crud.create(
					`layerref`,
					{
						"layer": `geonode:${systemName}`,
						"location": mongoLocation._id,
						"year": null,
						"active": true,
						"areaTemplate": request.body.data.scope.featureLayers[0],
						"columnMap": [],
						"isData": false,
						"fidColumn": "fid",
						"nameColumn": "Name",
					},
					{
						userId: request.session.userId,
						isAdmin: response.locals.isAdmin
					}, (err, result) => {
						if (err) {
							reject(new Error("It wasn't possible to create object of type: location by User: " + request.session.userId +
								" With data: " + request.body.data + " Error: " + err));
						} else {
							Promise.all([
								this.permissions.add(request.session.userId, `location`, result._id, "GET"),
								this.permissions.add(request.session.userId, `location`, result._id, "PUT"),
								this.permissions.add(request.session.userId, `location`, result._id, "DELETE")
							]).then(() => {
								resolve(result);
							}).catch((error) => {
								reject(error);
							});
						}
					});
			});
		}).then(() => {
			response.status(200).send({
				success: true
			});
		}).catch((error) => {
			response.status(500).send({
				message: error.message,
				success: false
			});
		});
	}
}

module.exports = ImportController;