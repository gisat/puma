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

let DBFEditor = require(`../integration/DBFEditor`);

class ImportController {
	constructor(app, pgPool) {
		app.post('/rest/import/csv', this.csv.bind(this));

		app.post(`/rest/import/layer`, this.layer.bind(this));

		this._app = app;
		this._pgPool = pgPool;
		this.permissions = new PgPermissions(pgPool, config.postgreSqlSchema);
		this._dbfEditor = new DBFEditor();

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
		let data = JSON.parse(request.body.data);
		let place = data.place;
		let scope = data.scope;
		let columnMap = {};
		let files = request.files;
		let userId = request.session.userId;
		let isAdmin = response.locals.isAdmin;
		let systemName = `au_${Math.random().toString(36).substring(3)}`;

		Promise.resolve()
			.then(() => {
				if (files.shp && files.shx && files.dbf && files.prj) {
					return this._dbfEditor.prepareDbfFileForImport(files.dbf.path)
						.then(() => {
							return this._dbfEditor.getDbfFileDescriptors(files.dbf.path);
						})
						.then((descriptors) => {
							descriptors.forEach((descriptor) => {
								if(!columnMap.hasOwnProperty(`name`) && descriptor.name.match(/name/i)) {
									columnMap[`name`] = descriptor.name;
								}
							})
						})
						.then(() => {
							if(!columnMap.hasOwnProperty(`name`)) {
								throw new Error(`obligatory column is missing: name`);
							}
						});
				}
			})
			.then(() => {
				if (!place.hasOwnProperty(`dataset`)) {
					place[`dataset`] = data.scope._id;
				}
				if (place.hasOwnProperty(`_id`)) {
					return this._metadataUpdate(place, `location`, userId, isAdmin);
				} else {
					return this._metadataCreate(place, `location`, userId, isAdmin)
						.then((metadata) => {
							place = metadata;
						});
				}
			})
			.then(() => {
				if (files.shp && files.shx && files.dbf && files.prj) {
					return this._layerCreate(files, systemName)
						.then(() => {
							return this._metadataGet(
								{
									location: Number(place._id),
									isData: false,
									areaTemplate: Number(scope.featureLayers[0])
								},
								`layerref`,
								userId,
								isAdmin
							)
						})
						.then((layerrefs) => {
							return Promise.resolve().then(() => {
								if (layerrefs.length) {
									let oldSystemName = layerrefs[0].layer.split(`:`)[1];
									let promises = [];
									for (let layerref of layerrefs) {
										promises.push(
											this._metadataRemove(
												{_id: Number(layerref._id)},
												`layerref`,
												userId,
												isAdmin
											).then(() => {
												return this._layerRemove(oldSystemName)
											})
										);
									}
									return Promise.all(promises);
								}
							}).then(() => {
								return this._metadataCreate(
									{
										"layer": `geonode:${systemName}`,
										"location": Number(place._id),
										"year": null,
										"active": true,
										"areaTemplate": Number(scope.featureLayers[0]),
										"columnMap": [],
										"isData": false,
										"fidColumn": "fid",
										"nameColumn": columnMap[`name`]
									},
									`layerref`,
									userId,
									isAdmin
								)
							});
						});
				}
			})
			.then(() => {
				response.status(200).send({
					success: true
				});
			})
			.catch((error) => {
				response.status(500).send({
					message: error.message,
					success: false
				});
			});
	}

	_layerCreate(files, systemName) {
		return Promise.resolve()
			.then(() => {
				let pathToFiles = `${config.temporaryDownloadedFilesLocation}${systemName}`;

				fs.mkdirSync(pathToFiles);

				for (let key of (Object.keys(files))) {
					fs.renameSync(files[key].path, `${pathToFiles}/${systemName}.${key}`);
				}

				return this._geoserverImporter.importLayer(
					{
						type: `vector`,
						systemName: systemName,
						directory: pathToFiles
					},
					true
				)
			})
			.then(() => {
				return superagent
					.get(`http://localhost/cgi-bin/updatelayers?f=${systemName}&s=datastore&w=geonode&other=removeDeleted`);
			})
	}

	_layerRemove(systemName) {
		return this._geoserverImporter.removeVectorLayer(systemName)
			.then(() => {
				return superagent
					.get(`http://localhost/cgi-bin/updatelayers?f=${systemName}&s=datastore&w=geonode&other=removeDeleted`);
			})
			.then(() => {
				return this._pgPool.query(`DROP TABLE IF EXISTS "public"."${systemName}" CASCADE;`);
			});
	}

	_metadataCreate(metadata, type, userId, isAdmin) {
		return new Promise((resolve, reject) => {
			crud.create(type, metadata, {
				userId: userId,
				isAdmin: isAdmin
			}, (err, result) => {
				if (err) {
					reject(new Error("It wasn't possible to create object of type: " + type + " by User: " + userId +
						" With data: " + metadata + " Error: " + err));
				} else {
					Promise.all([
						this.permissions.add(userId, type, result._id, "GET"),
						this.permissions.add(userId, type, result._id, "PUT"),
						this.permissions.add(userId, type, result._id, "DELETE")
					]).then(() => {
						resolve(result);
					}).catch((error) => {
						reject(error);
					});
				}
			});
		});
	}

	_metadataGet(filter, type, userId, isAdmin) {
		return new Promise((resolve, reject) => {
			crud.read(type, filter, {
				userId: userId,
				isAdmin: isAdmin
			}, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		});
	}

	_metadataUpdate(metadata, type, userId, isAdmin) {
		metadata = _.cloneDeep(metadata);
		return new Promise((resolve, reject) => {
			crud.update(type, metadata, {
				userId: userId,
				isAdmin: isAdmin
			}, function (err, result) {
				if (err) {
					reject(new Error("It wasn't possible to update object of type: " + type + " by User: " + userId +
						" With data: " + JSON.stringify(metadata) + " Error: " + err));
				} else {
					resolve(result);
				}
			});
		})
	}

	_metadataRemove(metadata, type, userId, isAdmin) {
		return new Promise((resolve, reject) => {
			crud.remove(type, metadata, {
				userId: userId,
				isAdmin: isAdmin
			}, function (err, result) {
				if (err) {
					reject(new Error("It wasn't possible to remove object of type: " + type + " by User: " + userId +
						" With data: " + metadata + " Error: " + err));
				} else {
					resolve(result);
				}
			});
		})
	}
}

module.exports = ImportController;