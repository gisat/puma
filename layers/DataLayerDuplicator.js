const superagent = require('superagent');
const uuid = require('uuid/v4');
const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const zipper = require('zip-local');

const config = require('../config');

const GeoServerImporter = require('../layers/GeoServerImporter');

class DataLayerDuplicator {
	constructor(processes) {
		this._geoserverPath = `http://${config.geoserverHost}/${config.geoserverPath}`;
		this._geoserverUsername = config.geoserverUsername;
		this._geoserverPassword = config.geoserverPassword;
		this._geoserverWorkspace = `geonode`;
		this._geoserverDatastore = `datastore`;
		this._temporaryStoragePath = config.pantherTemporaryStoragePath;
		this._processes = processes;
		this._uuid = () => {
			return uuid();
		}
	}

	duplicateGeoserverLayer(layerName) {
		let uuid = this._uuid();
		this._processes[uuid] = {
			uuid: uuid,
			inputLayer: layerName,
			outputLayer: null,
			progress: 0,
			status: "running"
		};

		this.ensureFolder(this._temporaryStoragePath)
			.then(() => {
				this._processes[uuid].progress = 10;
				return this.getGeoserverShapeLayerDownloadUrlByLayerName(layerName)
			})
			.then((url) => {
				this._processes[uuid].progress = 20;
				return this.downloadFileFromRemote(url)
			})
			.then((download) => {
				this._processes[uuid].progress = 30;
				return this.renameDownloadByContentType(download);
			})
			.then((renamed) => {
				this._processes[uuid].progress = 40;
				if (renamed.contentType === 'application/zip') {
					return this.unzipPackage(renamed);
				}
			})
			.then((directory) => {
				this._processes[uuid].progress = 50;
				return this.removeFile(directory.input)
					.then(() => {
						return directory;
					})
			})
			.then((directory) => {
				this._processes[uuid].progress = 60;
				return this.renameFilesInDirectory(directory.path)
					.then(() => {
						return directory;
					})
			})
			.then((directory) => {
				this._processes[uuid].progress = 75;
				return this.getImportMetadata(directory)
			})
			.then((metadata) => {
				this._processes[uuid].progress = 90;
				return this.importToGeoserver(metadata)
			})
			.then((resultLayerName) => {
				this._processes[uuid].progress = 100;
				this._processes[uuid].outputLayer = `${this._geoserverWorkspace}:${resultLayerName}`;
				this._processes[uuid].status = "done";
			});

		return Promise.resolve(this._processes[uuid]);
	}

	getImportMetadata(directory) {
		let metadata = {
			file: null,
			prj: null,
			other: [],
			type: "file",
			format: null
		};

		return new Promise((resolve, reject) => {
			fs.readdir(directory.path, (error, files) => {
				if (error) {
					reject(error);
				} else {
					files.forEach((file) => {
						let ext = file.split('.').pop().toLowerCase();
						switch (ext) {
							case 'shp':
								metadata.file = `${directory.path}/${file}`;
								metadata.format = 'Shapefile';
								break;
							case 'tif':
								metadata.file = `${directory.path}/${file}`;
								metadata.format = 'GeoTiff';
								break;
							case 'prj':
								metadata.prj = `${directory.path}/${file}`;
								break;
							default:
								metadata.other.push(`${directory.path}/${file}`);
								break;
						}
					});
					resolve(metadata);
				}
			});
		});
	}

	importToGeoserver(metadata) {
		return new GeoServerImporter(this._geoserverPath, this._geoserverUsername, this._geoserverPassword, this._geoserverWorkspace, this._geoserverDatastore)
			.importLocalFile(metadata);
	}

	renameFilesInDirectory(path) {
		return new Promise((resolve, reject) => {
			fs.readdir(path, (error, files) => {
				if (error) {
					reject(error)
				} else {
					resolve(files);
				}
			})
		}).then((files) => {
			return this.getSystemFriendlyName()
				.then((name) => {
					return {
						files: _.map(files, (file) => {
							return `${path}/${file}`
						}),
						name: name
					}
				})
		}).then(async (result) => {
			for (let file of result.files) {
				let ext = file.split('.').pop();
				await fse.copy(`${file}`, `${path}/${result.name}.${ext}`);
				await fse.remove(file);
			}
		});
	}

	removeFile(path) {
		return fse.remove(path);
	}

	unzipPackage(zipPackage) {
		let result = {
			input: zipPackage.path,
			path: `${this._temporaryStoragePath}/${zipPackage.filename}`
		};

		return this.ensureFolder(result.path)
			.then(() => {
				zipper.sync.unzip(result.input).save(result.path);
				return result;
			});
	}

	renameDownloadByContentType(download) {
		let renamed = {
			filename: download.filename,
			path: null,
			contentType: download.contentType
		};

		return Promise.resolve()
			.then(() => {
				return this.getExtensionByContentType(download.contentType)
			})
			.then((extension) => {
				renamed.path = `${this._temporaryStoragePath}/${download.filename}${extension}`;
				return fse.move(download.path, renamed.path);
			})
			.then(() => {
				return renamed;
			});
	}

	downloadFileFromRemote(remotePath) {
		return new Promise((resolve, reject) => {
			let temporaryFilename = `${uuid()}`;
			let temporaryFilePath = `${this._temporaryStoragePath}/${temporaryFilename}.tmp`;
			let contentType;

			superagent
				.get(remotePath)
				.on('response', (response) => {
					if (response.status === 200) {
						contentType = response.headers['content-type'];
					}
				})
				.on('end', () => {
					resolve({
						contentType: contentType,
						filename: temporaryFilename,
						path: temporaryFilePath
					});
				})
				.on('error', (error) => {
					fse.remove(temporaryFilePath)
						.then(() => {
							reject(error);
						})
						.catch((error) => {
							reject(error);
						})
				})
				.pipe(fs.createWriteStream(temporaryFilePath));
		});
	}

	getGeoserverShapeLayerDownloadUrlByLayerName(layerName) {
		return Promise.resolve(
			`${this._geoserverPath}/wfs?request=GetFeature&service=WFS&version=1.0.0&typeName=${layerName}&outputFormat=SHAPE-ZIP`
		);
	}

	ensureFolder(path) {
		return fse.ensureDir(path);
	}

	getSystemFriendlyName() {
		return Promise.resolve(`panther_${uuid().replace(/-/g, '')}`);
	}

	getExtensionByContentType(contentType) {
		return Promise.resolve()
			.then(() => {
				switch (contentType) {
					case 'application/zip':
						return '.zip';
					default:
						throw new Error('Unknown content type.');
				}
			});
	}
}

module.exports = DataLayerDuplicator;