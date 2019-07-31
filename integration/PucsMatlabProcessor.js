const uuid = require('uuid');
const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const childProcess = require('child_process');

const config = require('../config');

const GeoServerImporter = require('../layers/GeoServerImporter');
const PgLayers = require('../layers/PgLayers');
const PgSpatialDataSources = require('../metadata/PgSpatialDataSources');

class PucsMatlabProcessor {
	constructor(modelType, pathToMatlabWorkDirectory, pathToMatlabRuntime, pgPool, pgSchema, mongo) {
		this._pathToWorkDirectory = pathToMatlabWorkDirectory;
		this._pathToMatlabRuntime = pathToMatlabRuntime;
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
		this._modelType = modelType;

		this._pgLayers = new PgLayers(pgPool, mongo, pgSchema);
		this._pgSpatialDataSources = new PgSpatialDataSources(pgPool, pgSchema);
	}

	process(inputPath, pantherDataStoragePath, owner) {
		return this._getVectorFiles(inputPath)
			.then((inputVectors) => {
				if(inputVectors && inputVectors.length) {
					return this._rasterizeVectors(inputPath, inputVectors);
				} else {
					throw new Error('Unable to find any vector files.');
				}
			})
			.then((rasterizedVectors) => {
				return this._processRasterizedVectors(inputPath, rasterizedVectors, pantherDataStoragePath);
			})
			.then((metadata) => {
				return this._renameOutputs(metadata);
			})
			.then((metadata) => {
				return this._importIntoGeoserver(metadata);
			})
			.then((metadata) => {
				return this._storeAsPgLayers(metadata, owner);
			})
			.then((metadata) => {
				return this._createSpatialDataSources(metadata);
			});
	}

	_createSpatialDataSources(metadata) {
		let promises = [];

		metadata.forEach((layerMetadata) => {
			layerMetadata.inputVectors.forEach((inputVectorLayer) => {
				promises.push(
					this._pgSpatialDataSources.create(
						{
							type: `shapefile`,
							data: {
								layer_name: inputVectorLayer.geoserverLayer,
								table_name: inputVectorLayer.geoserverLayer.split(':')[1]
							}
						}
					).then((payload) => {
						inputVectorLayer['spatialDataSourceId'] = payload[0].id;
					})
				)
			});

			layerMetadata.inputRasters.forEach((inputRasterLayer) => {
				promises.push(
					this._pgSpatialDataSources.create(
						{
							type: `geotiff`,
							data: {
								layer_name: inputRasterLayer.geoserverLayer
							}
						}
					).then((payload) => {
						inputRasterLayer['spatialDataSourceId'] = payload[0].id;
					})
				)
			});

			layerMetadata.outputRasters.forEach((outputRasterLayer) => {
				promises.push(
					this._pgSpatialDataSources.create(
						{
							type: `geotiff`,
							data: {
								layer_name: outputRasterLayer.geoserverLayer
							}
						}
					).then((payload) => {
						outputRasterLayer['spatialDataSourceId'] = payload[0].id;
					})
				)
			});
		});

		return Promise.all(promises)
			.then(() => {
				return metadata;
			});
	}

	_storeAsPgLayers(metadata, owner) {
		let promises = [];

		metadata.forEach((processMetadata) => {
			processMetadata.inputVectors.forEach((inputVector) => {
				promises.push(
					this._pgLayers.add(inputVector.originalName, inputVector.geoserverLayer, null, null, owner.id)
				)
			});
			processMetadata.inputRasters.forEach((inputRaster) => {
				promises.push(
					this._pgLayers.add(inputRaster.originalName, inputRaster.geoserverLayer, null, null, owner.id)
				)
			});
			processMetadata.outputRasters.forEach((outputRaster) => {
				promises.push(
					this._pgLayers.add(outputRaster.originalName, outputRaster.geoserverLayer, null, null, owner.id)
				)
			});
		});

		return Promise.all(promises)
			.then(() => {
				return metadata;
			})
	}

	_importIntoGeoserver(metadataList) {
		let geoserverImportPath = `http://${config.geoserverHost}${config.geoserverPath}`;
		let geoserverUsername = config.geoserverUsername;
		let geoserverPassword = config.geoserverPassword;
		let geoserverWorkspace = `geonode`;
		let geoserverDatastore = `datastore`;

		let promises = [];

		metadataList.forEach((metadata) => {
			metadata.inputVectors.forEach((inputVector) => {
				promises.push(
					new GeoServerImporter(geoserverImportPath, geoserverUsername, geoserverPassword, geoserverWorkspace, geoserverDatastore)
						.importLocalFile({
							type: "file",
							format: "Shapefile",
							file: `${metadata.directory}/${inputVector.systemName}`,
							prj: `${metadata.directory}/${inputVector.prj}`,
							other: _.map(inputVector.other, (other) => {
								return `${metadata.directory}/${other}`
							})
						})
						.then((layerName) => {
							if (layerName) {
								inputVector.geoserverLayer = `${geoserverWorkspace}:${layerName}`;
							} else {
								inputVector = {
									message: `Unable to create geoserver layer from file ${metadata.directory}/${inputVector.systemName}`,
									success: false
								}
							}
						})
				)
			});

			metadata.inputRasters.forEach((inputRaster) => {
				promises.push(
					new GeoServerImporter(geoserverImportPath, geoserverUsername, geoserverPassword, geoserverWorkspace)
						.importLocalFile({
							type: "file",
							format: "GeoTIFF",
							file: `${metadata.directory}/${inputRaster.systemName}`
						})
						.then((layerName) => {
							if (layerName) {
								inputRaster.geoserverLayer = `${geoserverWorkspace}:${layerName}`;
							} else {
								inputRaster = {
									message: `Unable to create geoserver layer from file ${metadata.directory}/${inputRaster.systemName}`,
									success: false
								}
							}
						})
				)
			});

			metadata.outputRasters.forEach((outputRaster) => {
				promises.push(
					new GeoServerImporter(geoserverImportPath, geoserverUsername, geoserverPassword, geoserverWorkspace)
						.importLocalFile({
							type: "file",
							format: "GeoTIFF",
							file: `${metadata.directory}/${outputRaster.systemName}`
						})
						.then((layerName) => {
							if (layerName) {
								outputRaster.geoserverLayer = `${geoserverWorkspace}:${layerName}`;
								if (outputRaster.originalName.includes('HWD')) {
									outputRaster.indicator = 'hwd'
								} else if (outputRaster.originalName.includes('UHI')) {
									outputRaster.indicator = 'uhi'
								}
							} else {
								outputRaster = {
									message: `Unable to create geoserver layer from file ${metadata.directory}/${outputRaster.systemName}`,
									success: false
								}
							}
						})
				)
			});
		});

		return Promise.all(promises)
			.then(() => {
				return metadataList;
			});
	}

	_renameOutputs(outputs) {
		let promises = [];
		outputs.forEach((output) => {
			promises.push(
				new Promise((resolve, reject) => {
					let renamedOutput = {
						uuid: output.uuid,
						directory: output.directory
					};

					Promise.resolve().then(() => {
						return Promise.all(
							_.map(output.inputVectors, (inputVector) => {
								return Promise.resolve().then(() => {
									let originalName = inputVector;
									let originalFilenameParts = originalName.split('.');
									let ext = originalFilenameParts.pop();
									let name = originalFilenameParts.join('.');
									let systemName = `${this._getUniqueName()}`;
									let prj = null;
									let other = [];

									return new Promise((resolve, reject) => {
										fs.readdir(renamedOutput.directory, (err, files) => {
											if (err) {
												reject(err);
											} else {
												resolve(files);
											}
										})
									}).then((files) => {
										let renamed = [];

										files.forEach((file) => {
											let fileParts = file.split('.');
											let fileExt = fileParts.pop();
											let fileName = fileParts.join('.');

											if (fileExt.toLowerCase() !== 'tif' && fileName === name) {
												if (fileExt.toLowerCase() === 'prj') {
													prj = `${systemName}.${fileExt}`;
												}

												if (fileExt.toLowerCase() === 'shx' || fileExt.toLowerCase() === 'dbf') {
													other.push(`${systemName}.${fileExt}`);
												}

												renamed.push(
													fse.move(`${renamedOutput.directory}/${file}`, `${renamedOutput.directory}/${systemName}.${fileExt}`)
												)
											}
										});

										return Promise.all(renamed)
											.then(() => {
												return {
													systemName: `${systemName}.${ext}`,
													prj: prj,
													other: other,
													originalName: originalName
												}
											});
									});
								})
							})
						).then((results) => {
							renamedOutput.inputVectors = results;
						});
					}).then(() => {
						return Promise.all(
							_.map(output.inputRasters, (inputRaster) => {
								return Promise.resolve().then(() => {
									let originalName = inputRaster;
									let ext = originalName.split('.').pop();
									let systemName = `${this._getUniqueName()}.${ext}`;

									return fse.move(`${renamedOutput.directory}/${originalName}`, `${renamedOutput.directory}/${systemName}`)
										.then(() => {
											return {
												systemName: systemName,
												originalName: originalName
											}
										});
								})
							})
						).then((results) => {
							renamedOutput.inputRasters = results;
						});
					}).then(() => {
						return Promise.all(
							_.map(output.outputRasters, (outputRaster) => {
								return Promise.resolve().then(() => {
									let originalName = outputRaster;
									let ext = originalName.split('.').pop();
									let systemName = `${this._getUniqueName()}.${ext}`;

									return fse.move(`${renamedOutput.directory}/${originalName}`, `${renamedOutput.directory}/${systemName}`)
										.then(() => {
											return {
												systemName: systemName,
												originalName: originalName
											}
										});
								})
							})
						).then((results) => {
							renamedOutput.outputRasters = results;
						});
					}).then(() => {
						resolve(renamedOutput);
					})
				})
			)
		});
		return Promise.all(promises);
	}

	_moveDataToStorage(dataDirectory, pathToBaseStorage, processKey) {
		let dataStoragePath = `${pathToBaseStorage}/pucs_matlab_outputs/${processKey}`;
		return fse.move(dataDirectory, dataStoragePath)
			.then(() => {
				return dataStoragePath;
			});
	}

	_processRasterizedVectors(pathToInput, rasterizedVectors, pantherDataStoragePath) {
		let computePromises = [];

		rasterizedVectors.forEach((rasterizedVector) => {
			let processKey = uuid();
			let file = rasterizedVector.split(`/`).pop();
			let fileName = file.replace(/\.[^/.]+$/, "");

			computePromises.push(
				this._prepareEnviroment(processKey)
					.then(() => {
						return fse.copy(rasterizedVector, `${this._pathToWorkDirectory}/${processKey}/Input_Scenario/Input_UA_2012_scenario.tif`);
					})
					.then(() => {
						return this._executeMatlabProcessor(`${this._pathToWorkDirectory}/${processKey}`);
					})
					.then(() => {
						return this._getMatlabProcessorResults(`${this._pathToWorkDirectory}/${processKey}`);
					})
					.then((matlabProcessorResults) => {
						return this._moveMatlabProcessorResults(
							fileName,
							matlabProcessorResults,
							`${this._pathToWorkDirectory}/${processKey}/Result`,
							pathToInput
						)
					})
					.then(() => {
						return this._moveDataToStorage(pathToInput, pantherDataStoragePath, processKey);
					})
					.then((dataStoragePath) => {
						return this._getOutputMetadata(dataStoragePath, processKey);
					})
					.then((outputMetadata) => {
						return this._cleanEnviroment(processKey)
							.then(() => {
								return outputMetadata;
							})
					})
			)
		});

		return Promise.all(computePromises);
	}

	_getOutputMetadata(dataStoragePath, processKey) {
		return new Promise((resolve, reject) => {
			fs.readdir(dataStoragePath, (error, files) => {
				if (error) {
					reject(error)
				} else {
					let metadata = {
						uuid: processKey,
						inputVectors: [],
						inputRasters: [],
						outputRasters: [],
						directory: dataStoragePath
					};

					files.forEach((file) => {
						if (file.toLowerCase().endsWith('.shp')) {
							metadata.inputVectors.push(`${file}`);
						} else if (file.toLowerCase().endsWith('_scenario.tif')) {
							metadata.outputRasters.push(`${file}`);
						} else if (file.toLowerCase().endsWith('.tif')) {
							metadata.inputRasters.push(`${file}`);
						}
					});

					resolve(metadata);
				}
			});
		});
	}

	_moveMatlabProcessorResults(baseFileName, matlabProcessorResults, source, destination) {
		let movePromises = [];

		matlabProcessorResults.forEach((matlabProcessorResult) => {
			movePromises.push(
				fse.move(`${source}/${matlabProcessorResult}`, `${destination}/${baseFileName}${matlabProcessorResult.replace(`PRAGUE`, ``)}`)
			);
		});

		return Promise.all(movePromises);
	}

	_getMatlabProcessorResults(workDirectory) {
		return new Promise((resolve, reject) => {
			fs.readdir(`${workDirectory}/Result`, (error, files) => {
				if (error) {
					reject(error);
				} else {
					resolve(_.filter(files, (file) => {
						return file.toLowerCase().endsWith(`.tif`);
					}));
				}
			})
		});
	}

	_executeMatlabProcessor(workDirectory) {
		return new Promise((resolve, reject) => {
			let command = [
				`docker`,
				`run`,
				`--rm=true`,
				`-v ${workDirectory}:${workDirectory}`,
				`-w ${workDirectory}`,
				`mbabic84/matlab:R2016a`,
				`bash`,
				`./run_Runscript.sh`,
				`${this._pathToMatlabRuntime}`,
				`./NN_Configfile.cfg`
			];
			childProcess.exec(command.join(` `), (error, stdout, stderr) => {
				if (error) {
					reject(error);
				} else if (stderr) {
					reject(stderr);
				} else {
					resolve();
				}
			});
		});
	}

	_rasterizeVectors(pathToInput, inputVectors) {
		let modelOptions = this._getModeOptionsByType(this._modelType);
		return new Promise((resolve, reject) => {
			let rasterizePromises = [];
			inputVectors.forEach((inputVector) => {
				rasterizePromises.push(
					new Promise((resolve, reject) => {
						let vectorName = inputVector.replace(/\.[^/.]+$/, "");
						let command = [
							`gdal_rasterize`,
							`${modelOptions.init}`,
							`${modelOptions.nodata}`,
							`-a CODE2012`,
							`${modelOptions.extent}`,
							`${modelOptions.pixelSize}`,
							`${modelOptions.rasterResolution}`,
							`-l ${vectorName}`,
							`${pathToInput}/${inputVector}`,
							`${pathToInput}/${vectorName}.tif`
						];
						childProcess.exec(command.join(` `), (error, stdout, stderr) => {
							if (error) {
								reject(error);
							} else if (stderr) {
								reject(stderr);
							} else {
								resolve(`${pathToInput}/${vectorName}.tif`);
							}
						});
					})
				);
				Promise.all(rasterizePromises)
					.then((results) => {
						resolve(results);
					})
					.catch((error) => {
						reject(error);
					})
			});
		});
	}

	_getVectorFiles(path) {
		return new Promise((resolve, reject) => {
			fs.readdir(path, (error, files) => {
				if (error) {
					reject(error);
				} else {
					resolve(_.filter(files, (file) => {
						return file.toLowerCase().endsWith(`.shp`);
					}));
				}
			})
		});
	}

	_prepareEnviroment(processKey) {
		return this._createEnviromentDirectory(processKey)
			.then(() => {
				return this._copyProcessorToEnviromentDirectory(processKey)
			})
			.catch((error) => {
				console.log(error);
			})
	}

	_createEnviromentDirectory(processKey) {
		return fse.ensureDir(`${this._pathToWorkDirectory}/${processKey}`);
	}

	_copyProcessorToEnviromentDirectory(processKey) {
		return fse.copy(`${this._pathToWorkDirectory}/.matlab_processor`, `${this._pathToWorkDirectory}/${processKey}`);
	}

	_cleanEnviroment(processKey) {
		return fse.remove(`${this._pathToWorkDirectory}/${processKey}`);
	}

	_getUniqueName() {
		return `pucs_${uuid().replace(/-/g, '')}`;
	}

	_getModeOptionsByType(type) {
		switch(type) {
			case `prague`:
				return {
					init: `-init 255`,
					nodata: ``,
					rasterResolution: `-ts 301 301`,
					pixelSize: `-tr 0.0015 0.0015`,
					extent: `-te 14.2142000 49.8242000 14.6657000 50.2757000`
				};
			case `ostrava`:
				return {
					init: `-init 65536`,
					nodata: `-a_nodata 65536`,
					rasterResolution: `-ts 201 201`,
					pixelSize: `-tr 0.0015 0.0015`,
					extent: `-te 18.1493000 49.6793000 18.4508000 49.9808000`
				};
			case `dhaka`:
				return {
					init: `-init 21000`,
					nodata: ``,
					rasterResolution: `-ts 355 355`,
					pixelSize: `-tr 100 100`,
					extent: `-te 218627.000 2615080.000 254127.000 2650580.000`
				};
		}
	}
}

module.exports = PucsMatlabProcessor;