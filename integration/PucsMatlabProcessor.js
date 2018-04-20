const uuid = require('uuid');
const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const childProcess = require('child_process');

class PucsMatlabProcessor {
	constructor(pathToMatlabWorkDirectory) {
		console.log(`PucsMatlabProcessor#constructor: pathToMatlabWorkDirectory`, pathToMatlabWorkDirectory);

		this._pathToWorkDirectory = pathToMatlabWorkDirectory;
	}

	process(pathToInput) {
		return this._getVectorFiles(pathToInput)
			.then((inputVectors) => {
				return this._rasterizeVectors(pathToInput, inputVectors);
			})
			.then((rasterizedVectors) => {
				return this._processRasterizedVectors(pathToInput, rasterizedVectors);
			});
	}

	_processRasterizedVectors(pathToInput, rasterizedVectors) {
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
						return this._cleanEnviroment(processKey);
					})
			)
		});

		return Promise.all(computePromises);
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
				`/usr/local/MATLAB/MATLAB_Runtime/v901`,
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
}

module.exports = PucsMatlabProcessor;