const uuid = require('uuid');
const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const childProcess = require('child_process');

class PucsMatlabProcessor {
	constructor(pathToMatlabWorkDirectory, pathToMatlabRuntime, pgPool, postgreSqlSchema) {
		this._pathToWorkDirectory = pathToMatlabWorkDirectory;
		this._pathToMatlabRuntime = pathToMatlabRuntime;
		this._pgPool = pgPool;
		this._pgSchema = postgreSqlSchema;
		this._pgTableName = `pucs_matlab_outputs`;

		this._initMatlabProcessesPgTable();
	}

	process(inputPath, pantherDataStoragePath) {
		return this._getVectorFiles(inputPath)
			.then((inputVectors) => {
				return this._rasterizeVectors(inputPath, inputVectors);
			})
			.then((rasterizedVectors) => {
				return this._processRasterizedVectors(inputPath, rasterizedVectors, pantherDataStoragePath);
			});
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
						return fse.copy(rasterizedVector, `${this._pathToWorkDirectory}/${processKey}/Input_Scenario/Prague_UA_2012_scenario.tif`);
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
						return this._storeOutputMetadataIntoPgTable(outputMetadata);
					})
					.then(() => {
						return this._cleanEnviroment(processKey);
					})
					.then(() => {
						return processKey;
					})
			)
		});

		return Promise.all(computePromises);
	}

	_getOutputMetadata(dataStoragePath, processKey) {
		return new Promise((resolve, reject) => {
			fs.readdir(dataStoragePath, (error, files) => {
				if(error) {
					reject(error)
				} else {
					let metadata = {
						uuid: processKey,
						inputVectors: [],
						inputRasters: [],
						outputRasters: []
					};

					files.forEach((file) => {
						if(file.toLowerCase().endsWith('.shp')) {
							metadata.inputVectors.push(`${dataStoragePath}/${file}`);
						} else if(file.toLowerCase().endsWith('_scenario.tif')) {
							metadata.outputRasters.push(`${dataStoragePath}/${file}`);
						} else if(file.toLowerCase().endsWith('.tif')) {
							metadata.inputRasters.push(`${dataStoragePath}/${file}`);
						}
					});

					resolve(metadata);
				}
			});
		});
	}

	_storeOutputMetadataIntoPgTable(metadata) {
		let query = [];

		query.push(`INSERT INTO "${this._pgSchema}"."${this._pgTableName}"`);
		query.push(`(uuid, input_vector_paths, input_raster_paths, output_raster_paths)`);
		query.push(`VALUES`);
		query.push(`(`);
		query.push(`'${metadata.uuid}',`);
		query.push(`ARRAY['${metadata.inputVectors.join("', '")}'],`);
		query.push(`ARRAY['${metadata.inputRasters.join("', '")}'],`);
		query.push(`ARRAY['${metadata.outputRasters.join("', '")}']`);
		query.push(`);`);

		return this._pgPool.query(query.join(' '));
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
		return new Promise((resolve, reject) => {
			let rasterizePromises = [];
			inputVectors.forEach((inputVector) => {
				rasterizePromises.push(
					new Promise((resolve, reject) => {
						let vectorName = inputVector.replace(/\.[^/.]+$/, "");
						let command = [
							`gdal_rasterize`,
							`-init 255`,
							`-a CODE2012`,
							`-ts 301 301`,
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

	_initMatlabProcessesPgTable() {
		let query = [
			`CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._pgTableName}" (`,
			`uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),`,
			`input_vector_paths TEXT[],`,
			`input_raster_paths TEXT[],`,
			`output_raster_paths TEXT[]);`
		];

		this._pgPool.query(query.join(' '));
	}
}

module.exports = PucsMatlabProcessor;