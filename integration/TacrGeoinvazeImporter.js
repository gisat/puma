const fse = require(`fs-extra`);
const fs = require(`fs`);
const _ = require(`lodash`);
const superagent = require(`superagent`);
const child_process = require(`child_process`);
const path = require(`path`);

const config = require(`../config`);

const PgUsers = require(`../security/PgUsers`);
const PgMetadataCrud = require(`../metadata/PgMetadataCrud`);
const PgDataSourcesCrud = require(`../dataSources/PgDataSourcesCrud`);
const PgRelationsCrud = require(`../relations/PgRelationsCrud`);

class TacrGeoinvazeImporter {
	constructor(pgPool) {
		this._pgPool = pgPool;

		this._pgUsers = new PgUsers(pgPool, config.pgSchema.data);
		this._pgMetadataCrud = new PgMetadataCrud(this._pgPool, config.pgSchema.metadata);
		this._pgDataSourceCrud = new PgDataSourcesCrud(this._pgPool, config.pgSchema.dataSources);
		this._pgRelationsCrud = new PgRelationsCrud(this._pgPool, config.pgSchema.relations);
	}

	run() {
		return Promise
			.resolve()
			.then(() => {
				if (
					!config.projectSpecific
					|| !config.projectSpecific.tacrGeoinvaze
					|| !config.projectSpecific.tacrGeoinvaze.executeImport
				) {
					throw new Error(`Missing configuration or import disabled!`);
				}
			})
			.then(() => {
				return fse
					.pathExists(`${config.projectSpecific.tacrGeoinvaze.pathToImportData}/.imported`);
			})
			.then((imported) => {
				if (!imported || config.projectSpecific.tacrGeoinvaze.forceImport) {
					return this.import();
				} else {
					throw new Error(`Import already done. Skipped!`);
				}
			})
			.catch((error) => {
				console.log(error);
				console.log(`#### TacrGeoinvazeImporter # ${error.message}`);
			})
	}

	import(options) {
		let user;
		let speciesLayersToImport = {};
		let geoserverLayers;

		return Promise
			.resolve()
			.then(() => {
				return this._pgUsers.byId(0)
					.then((pgUser) => {
						user = pgUser;
					})
			})
			.then(() => {
				return this._pgMetadataCrud.get(
					`cases`,
					{
						filter: {
							applicationKey: config.projectSpecific.tacrGeoinvaze.applicationKey
						},
						limit: 9999999
					},
					user
				).then((getResult) => {
					return getResult.data.cases;
				})
			})
			.then((pgCases) => {
				return _.filter(pgCases, (pgCase) => {
					return pgCase.data.nameInternal;
				})
			})
			.then((pgCases) => {
				let rasters = [];
				let vectors = [];

				try {
					rasters = fs.readdirSync(`${config.projectSpecific.tacrGeoinvaze.pathToImportData}${options.path}/rasters`);
				} catch (e) {

				}

				try {
					vectors = fs.readdirSync(`${config.projectSpecific.tacrGeoinvaze.pathToImportData}${options.path}/vectors`);
				} catch (e) {

				}

				_.each(pgCases, (pgCase) => {
					let speciesName = pgCase.data.nameInternal.toLowerCase().replace(/\ |-/g, '_');
					let speciesRasters = _.filter(rasters, (raster) => {
						return raster.includes(speciesName) && raster.toLowerCase().endsWith(`tif`);
					});
					let speciesVectors = _.filter(vectors, (vector) => {
						return vector.includes(speciesName) && vector.toLowerCase().endsWith(`shp`);
					});

					if (speciesRasters.length || speciesVectors.length) {
						speciesLayersToImport[speciesName] = {
							caseKey: pgCase.key,
							speciesVectors,
							speciesRasters
						};
					}
				});
			})
			.then(() => {
				return superagent
					.get(`http://${config.geoserverHost}/${config.geoserverPath}/rest/layers.json`)
					.auth(config.geoserverUsername, config.geoserverPassword)
					.then((superagentResponse) => {
						geoserverLayers = superagentResponse.body.layers.layer;
					})
			})
			.then(async () => {
				for (let speciesName of Object.keys(speciesLayersToImport)) {
					let data = speciesLayersToImport[speciesName];

					console.log(`### Peeparing import of layers for ${speciesName}`);

					for (let vectorLayer of data.speciesVectors) {
						console.log(`#### Reprojecting ${vectorLayer} from ${config.projectSpecific.tacrGeoinvaze.transformation.source} to ${config.projectSpecific.tacrGeoinvaze.transformation.target}`);

						let vectorLayerName = path.parse(vectorLayer).name;

						if(vectorLayerName.length > 45) {
							throw new Error(`Layer ${vectorLayerName} exceeded max name length of 63 characters!`)
						}

						let existingGeoserverLayer = _.find(geoserverLayers, (geoserverLayer) => {
							return geoserverLayer.name === `${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}:${vectorLayerName}`;
						});

						if (existingGeoserverLayer) {
							await this.removeExistingGeoserverLayer(vectorLayerName, `vector`);
							await this.removeExistingGeoserverStyle(`${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}_${vectorLayerName}`);
						}

						this.reprojectFile(
							`${config.projectSpecific.tacrGeoinvaze.pathToImportData}${options.path}/vectors/${vectorLayer}`,
							`${config.projectSpecific.tacrGeoinvaze.pathToImportData}/${vectorLayerName}.shp`,
							config.projectSpecific.tacrGeoinvaze.transformation.source,
							config.projectSpecific.tacrGeoinvaze.transformation.target,
							`vector`
						);

						await this.importLayerIntoGeoserver(vectorLayerName, `vector`);

						await this.setDefaultStyleForGeoserverLayer(
							`${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}:${vectorLayerName}`,
							this.getLayerDefaultStyleNameByLayerName(vectorLayerName)
						);

						await this.createPantherDataForLayer(vectorLayerName, data.caseKey, `vector`, user, options.year, options.quarter);

						this.cleanup(config.projectSpecific.tacrGeoinvaze.pathToImportData);
					}

					let rasterImported = false;
					for (let rasterLayer of data.speciesRasters) {
						console.log(`#### Reprojecting ${rasterLayer} from ${config.projectSpecific.tacrGeoinvaze.transformation.source} to ${config.projectSpecific.tacrGeoinvaze.transformation.target}`);

						let rasterLayerName = path.parse(rasterLayer).name;

						if(rasterLayerName.length > 45) {
							throw new Error(`Layer ${rasterLayerName} exceeded max name length of 63 characters!`)
						}

						let existingGeoserverLayer = _.find(geoserverLayers, (geoserverLayer) => {
							return geoserverLayer.name === `${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}:${rasterLayerName}`;
						});

						if (existingGeoserverLayer) {
							await this.removeExistingGeoserverLayer(rasterLayerName, `raster`);
							await this.removeExistingGeoserverStyle(`${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}_${rasterLayerName}`);
						}

						await this.removeExistingRasterUploads(rasterLayerName, user);

						this.reprojectFile(
							`${config.projectSpecific.tacrGeoinvaze.pathToImportData}${options.path}/rasters/${rasterLayer}`,
							`${config.projectSpecific.tacrGeoinvaze.pathToImportData}/${rasterLayerName}.vrt`,
							config.projectSpecific.tacrGeoinvaze.transformation.source,
							config.projectSpecific.tacrGeoinvaze.transformation.target,
							`raster`,
							config.projectSpecific.tacrGeoinvaze.transformation.raster.noData
						);

						this.compressRaster(
							`${config.projectSpecific.tacrGeoinvaze.pathToImportData}/${rasterLayerName}.vrt`,
							`${config.projectSpecific.tacrGeoinvaze.pathToImportData}/${rasterLayerName}.tif`
						);

						await this.importLayerIntoGeoserver(rasterLayerName, `raster`);

						await this.setDefaultStyleForGeoserverLayer(
							`${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}:${rasterLayerName}`,
							this.getLayerDefaultStyleNameByLayerName(rasterLayerName)
						);

						await this.createPantherDataForLayer(rasterLayerName, data.caseKey, `raster`, user, options.year, options.quarter);

						this.cleanup(config.projectSpecific.tacrGeoinvaze.pathToImportData);
					}
				}
			});
	}

	createPantherDataForLayer(layerName, caseKey, type, user, year, quarter) {
		// let periodString = this.getPeriodStringFromLayerName(layerName);
		// let yearString = this.getYearFromPeriodString(periodString);
		// let quarterString = this.getQuarterFromPeriodStrin(periodString);

		let yearString = String(year);
		let quarterString = `Q${quarter}`;

		let pantherPeriod, pantherSpatialDataSource, pantherSpatialDataSourceRelation;
		let pantherLayerTemplateKey = this.getLayerTemplateKeyByLayerName(layerName);

		return this._pgMetadataCrud
			.get(
				`periods`,
				{
					filter: {
						applicationKey: config.projectSpecific.tacrGeoinvaze.applicationKey,
						nameDisplay: `${yearString}/${quarterString}`,
						nameInternal: `${yearString}/${quarterString}`,
						period: `${yearString}-${config.projectSpecific.tacrGeoinvaze.quarter[quarterString][0]}/${yearString}-${config.projectSpecific.tacrGeoinvaze.quarter[quarterString][1]}`
					}
				},
				user
			)
			.then((getResult) => {
				pantherPeriod = getResult.data.periods[0];
			})
			.then(() => {
				if (!pantherPeriod) {
					return this._pgMetadataCrud
						.create(
							{
								periods: [
									{
										data: {
											applicationKey: config.projectSpecific.tacrGeoinvaze.applicationKey,
											nameDisplay: `${yearString}/${quarterString}`,
											nameInternal: `${yearString}/${quarterString}`,
											period: `${yearString}-${config.projectSpecific.tacrGeoinvaze.quarter[quarterString][0]}/${yearString}-${config.projectSpecific.tacrGeoinvaze.quarter[quarterString][1]}`
										}
									}
								]
							},
							user,
							{}
						)
						.then(([data, erros]) => {
							pantherPeriod = data.periods[0];
						})
				}
			})
			.then(() => {
				let tableName;
				if (type === `vector`) {
					tableName = layerName;
				}

				let filter = {
					nameInternal: `${config.projectSpecific.tacrGeoinvaze.applicationKey}:${layerName}`,
					type,
					layerName: `${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}:${layerName}`,
				};

				if(tableName) {
					filter.tableName = tableName;
				};

				return this._pgDataSourceCrud
					.get(
						`spatial`,
						{
							filter
						},
						user
					)
					.then((getResult) => {
						pantherSpatialDataSource = getResult.data.spatial[0];
					})
			})
			.then(() => {
				if (!pantherSpatialDataSource) {
					let tableName = null;
					if (type === `vector`) {
						tableName = layerName;
					}

					return this._pgDataSourceCrud
						.create(
							{
								spatial: [
									{
										data: {
											nameInternal: `${config.projectSpecific.tacrGeoinvaze.applicationKey}:${layerName}`,
											type,
											layerName: `${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}:${layerName}`,
											tableName
										}
									}
								]
							},
							user,
							{}
						)
						.then(([data, errors]) => {
							pantherSpatialDataSource = data.spatial[0];
						})
				}
			})
			.then(() => {
				return this._pgRelationsCrud
					.get(
						`spatial`,
						{
							filter: {
								applicationKey: config.projectSpecific.tacrGeoinvaze.applicationKey,
								spatialDataSourceKey: pantherSpatialDataSource.key,
								layerTemplateKey: pantherLayerTemplateKey,
								caseKey,
								periodKey: pantherPeriod.key,
							}
						},
						user
					)
					.then((getResult) => {
						pantherSpatialDataSourceRelation = getResult.data.spatial[0];
					})
			})
			.then(() => {
				if (!pantherSpatialDataSourceRelation) {
					return this._pgRelationsCrud
						.create(
							{
								spatial: [
									{
										data: {
											applicationKey: config.projectSpecific.tacrGeoinvaze.applicationKey,
											spatialDataSourceKey: pantherSpatialDataSource.key,
											layerTemplateKey: pantherLayerTemplateKey,
											caseKey,
											periodKey: pantherPeriod.key,
										}
									}
								]
							},
							user,
							{}
						)
				}
			})
	}

	getLayerTemplateKeyByLayerName(layerName) {
		if (layerName.toLowerCase().includes("_gam")) {
			return config.projectSpecific.tacrGeoinvaze.layerTemplates.modelGam;
		} else if (layerName.toLowerCase().includes("_maxent")) {
			return config.projectSpecific.tacrGeoinvaze.layerTemplates.modelMaxEnt;
		} else if (layerName.toLowerCase().includes("_gbm")) {
			return config.projectSpecific.tacrGeoinvaze.layerTemplates.modelGbm;
		} else if (layerName.toLowerCase().includes("po_1_roce")) {
			return config.projectSpecific.tacrGeoinvaze.layerTemplates.model1;
		} else if (layerName.toLowerCase().includes("po_2_roce")) {
			return config.projectSpecific.tacrGeoinvaze.layerTemplates.model2;
		} else if (layerName.toLowerCase().includes("po_3_roce")) {
			return config.projectSpecific.tacrGeoinvaze.layerTemplates.model3;
		} else {
			return config.projectSpecific.tacrGeoinvaze.layerTemplates.origin;
		}
	}

	getLayerDefaultStyleNameByLayerName(layerName) {
		if (layerName.toLowerCase().includes("_gam")) {
			return config.projectSpecific.tacrGeoinvaze.geoserverStyles.modelGam;
		} else if (layerName.toLowerCase().includes("_maxent")) {
			return config.projectSpecific.tacrGeoinvaze.geoserverStyles.modelMaxEnt;
		} else if (layerName.toLowerCase().includes("_gbm")) {
			return config.projectSpecific.tacrGeoinvaze.geoserverStyles.modelGbm;
		} else if (layerName.toLowerCase().includes("po_1_roce")) {
			return config.projectSpecific.tacrGeoinvaze.geoserverStyles.model1;
		} else if (layerName.toLowerCase().includes("po_2_roce")) {
			return config.projectSpecific.tacrGeoinvaze.geoserverStyles.model2;
		} else if (layerName.toLowerCase().includes("po_3_roce")) {
			return config.projectSpecific.tacrGeoinvaze.geoserverStyles.model3;
		} else {
			return config.projectSpecific.tacrGeoinvaze.geoserverStyles.origin;
		}
	}

	getYearFromPeriodString(periodString) {
		let match = periodString.match(/^([0-9]{4}).*$/);
		return match[1];
	}

	getQuarterFromPeriodStrin(periodString) {
		let match = periodString.match(/^.*(Q[1-4]{1})$/);
		return match[1];
	}

	getPeriodStringFromLayerName(layerName) {
		let match = layerName.match(/.*_([0-9]{4}Q[1-4])$/);
		return match[1];
	}

	importRasterLayerIntoGeoserver(layerName) {
		return superagent
			.post(
				`http://127.0.0.1:8080/geoserver/rest/imports?exec=true`
			)
			.send({
				"import": {
					"targetWorkspace": {
						"workspace": {
							"name": `${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}`
						}
					},
					"data": {
						"type": "remote",
						"location": `${config.projectSpecific.tacrGeoinvaze.pathToImportData}/${layerName}.tif`
					}
				}
			})
			.auth(config.geoserverUsername, config.geoserverPassword)
			.catch((error) => {
				console.log(error);
			})
	}

	importVectorLayerIntoGeoserver(layerName) {
		return superagent
			.post(
				`http://127.0.0.1:8080/geoserver/rest/imports?exec=true`
			)
			.send({
				"import": {
					"targetWorkspace": {
						"workspace": {
							"name": `${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}`
						}
					},
					"targetStore": {
						"dataStore": {
							"name": `${config.projectSpecific.tacrGeoinvaze.geoserverStore}`
						}
					},
					"data": {
						"type": "file",
						"file": `${config.projectSpecific.tacrGeoinvaze.pathToImportData}/${layerName}.shp`,
						"prj": `${config.projectSpecific.tacrGeoinvaze.pathToImportData}/${layerName}.prj`,
						"other": [
							`${config.projectSpecific.tacrGeoinvaze.pathToImportData}/${layerName}.dbf`,
							`${config.projectSpecific.tacrGeoinvaze.pathToImportData}/${layerName}.shx`
						]
					}
				}
			})
			.auth(config.geoserverUsername, config.geoserverPassword)
			.catch((error) => {
				console.log(error);
			})
	}

	setDefaultStyleForGeoserverLayer(layerName, styleName) {
		return superagent
			.put(
				`http://127.0.0.1:8080/geoserver/rest/layers/${layerName}`
			)
			.set(`Content-Type`, `application/xml`)
			.send(`<?xml version="1.0" encoding="UTF-8"?><layer><defaultStyle><name>${styleName}</name></defaultStyle></layer>`)
			.auth(config.geoserverUsername, config.geoserverPassword)
			.catch((error) => {
				console.log(error);
			})
	}

	importLayerIntoGeoserver(layerName, type) {
		if (type === `vector`) {
			return this.importVectorLayerIntoGeoserver(layerName);
		} else if (type === `raster`) {
			return this.importRasterLayerIntoGeoserver(layerName);
		}
	}

	removeExistingGeoserverStyle(styleName) {
		return superagent
			.delete(
				`http://127.0.0.1:8080/geoserver/rest/styles/${styleName}?recurse=true`
			)
			.auth(config.geoserverUsername, config.geoserverPassword)
			.catch((error) => {
				console.log(error);
			})
	}

	removeExistingGeoserverVectorLayer(layerName) {
		return superagent
			.delete(
				`http://127.0.0.1:8080/geoserver/rest/workspaces/${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}/datastores/${config.projectSpecific.tacrGeoinvaze.geoserverStore}/featuretypes/${layerName}?recurse=true`
			)
			.auth(config.geoserverUsername, config.geoserverPassword)
			.then(() => {
				return this._pgPool.query(`DROP TABLE "${layerName}" CASCADE;`);
			})
			.catch((error) => {
				console.log(error);
			})
	}

	removeExistingGeoserverRasterLayer(layerName) {
		return superagent
			.delete(
				`http://127.0.0.1:8080/geoserver/rest/workspaces/${config.projectSpecific.tacrGeoinvaze.geoserverWorkspace}/coveragestores/${layerName}?recurse=true&purge=true`
			)
			.auth(config.geoserverUsername, config.geoserverPassword)
			.catch((error) => {
				console.log(error);
			})
	}

	removeExistingRasterUploads(layerName) {
		return superagent
			.get(`http://127.0.0.1:8080/geoserver/rest/imports`)
			.auth(config.geoserverUsername, config.geoserverPassword)
			.then(async (superagentResult) => {
				for (let importData of superagentResult.body.imports) {
					await superagent
						.get(`${importData.href}/data`)
						.auth(config.geoserverUsername, config.geoserverPassword)
						.then((superagentResult) => {
							if (
								superagentResult
								&& superagentResult.body
								&& superagentResult.body.files
								&& superagentResult.body.files[0]
								&& superagentResult.body.files[0].file === `${layerName}.tif`
							) {
								if (
									superagentResult.body.location
									&& superagentResult.body.location !== `/`
									&& fs.existsSync(superagentResult.body.location)
								) {
									fse.removeSync(superagentResult.body.location);
								}
							}
						})
						.catch((error) => {
							console.log(error);
						});

					await superagent
						.delete(`${importData.href}`)
						.auth(config.geoserverUsername, config.geoserverPassword)
						.catch((error) => {
							console.log(error);
						});
				}
			})
	}

	removeExistingGeoserverLayer(layerName, type) {
		if (type === `vector`) {
			return this.removeExistingGeoserverVectorLayer(layerName);
		} else if (type === `raster`) {
			return this.removeExistingGeoserverRasterLayer(layerName);
		}
	}

	cleanup(path) {
		let files = fs.readdirSync(path);

		_.each(files, (file) => {
			if (
				file.toLowerCase().endsWith(`.shp`)
				|| file.toLowerCase().endsWith(`.shx`)
				|| file.toLowerCase().endsWith(`.dbf`)
				|| file.toLowerCase().endsWith(`.prj`)
				|| file.toLowerCase().endsWith(`.tif`)
				|| file.toLowerCase().endsWith(`.vrt`)
			) {
				fs.unlinkSync(`${path}/${file}`);
			}
		});
	}

	reprojectFile(source, destination, sourceSrs, targetSrs, type, noDataValue = -9999) {
		if (type === `vector`) {
			child_process.execSync(
				`ogr2ogr -f "ESRI Shapefile" `
				+ `-t_srs ${targetSrs} `
				+ `-s_srs ${sourceSrs} `
				+ `${destination} `
				+ `${source}`
			);
		} else if (type === `raster`) {
			child_process.execSync(
				`gdalwarp `
				+ `-t_srs ${targetSrs} `
				+ `-s_srs ${sourceSrs} `
				+ `-dstnodata ${noDataValue} `
				+ `-of vrt `
				+ `${source} `
				+ `${destination}`
			);
		}
	}

	compressRaster(source, destination) {
		child_process.execSync(
			`gdal_translate `
			+ `-co compress=LZW `
			+ `${source} `
			+ `${destination}`
		)
	}
}

module.exports = TacrGeoinvazeImporter;