const _ = require(`lodash`);
const fs = require(`fs`);
const turf = require(`@turf/turf`);

class ImageMosaic {
	constructor(source, destination, pgOptions, prepareData) {
		this._source = source;
		this._destination = destination;
		this._pgOptions = pgOptions;

		if(prepareData) {
			this.prepareImageMosaicDataStructure();
		}
	}

	getDatesByGeometry(geometry) {
		let sourcesFilepath = `${this._destination}/scenes/.sources.json`;
		let sourcesFile = fs.readFileSync(sourcesFilepath);
		let sourcesJson = JSON.parse(sourcesFile);

		if (geometry.type === `MultiPolygon`) {
			geometry.type = `Polygon`;
			geometry.coordinates = geometry.coordinates[0]
		}

		let dates = [];
		sourcesJson.sources.forEach(source => {
			if (turf.intersect(geometry, source.geometry)) {
				let year = source.acquisition.substring(0, 4);
				let month = source.acquisition.substring(4, 6);
				let day = source.acquisition.substring(6, 8);
				let hour = source.acquisition.substring(9, 11);
				let min = source.acquisition.substring(11, 13);
				let sec = source.acquisition.substring(13);
				dates.push(`${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`);
			}
		});

		return _.uniq(dates);
	}


	prepareImageMosaicFsStructure() {
		console.log(`ImageMosaic#prepareImageMosaicFsStructure: destination`, this._destination);
		this.deleteFolderRecursive(this._destination);
		fs.mkdirSync(this._destination);
		fs.mkdirSync(`${this._destination}/scenes`);
	}

	prepareImageMosaicMetadata() {
		console.log(`ImageMosaic#prepareImageMosaicMetadata`);
		let indexer = [
			`Caching=false`,
			`TimeAttribute=time`,
			`Schema=*the_geom:Polygon,location:String,time:java.util.Date`,
			`PropertyCollectors=TimestampFileNameExtractorSPI[timeregex](time)`
		];
		fs.writeFileSync(`${this._destination}/indexer.properties`, indexer.join(`\n`));

		let timeregex = [
			`regex=[0-9]{8}T[0-9]{9}Z`
		];
		fs.writeFileSync(`${this._destination}/timeregex.properties`, timeregex.join(`\n`));

		let datastore = [
			`SPI=org.geotools.data.postgis.PostgisNGDataStoreFactory`,
			`host=${this._pgOptions.host}`,
			`port=${this._pgOptions.port}`,
			`database=${this._pgOptions.database}`,
			`schema=${this._pgOptions.schema}`,
			`user=${this._pgOptions.user}`,
			`passwd=${this._pgOptions.passwd}`,
			`Loose\\ bbox=true`,
			`Estimated\\ extends=false`,
			`validate\\ connections=true`,
			`Connection\\ timeout=10`,
			`preparedStatements=true`
		];
		fs.writeFileSync(`${this._destination}/datastore.properties`, datastore.join(`\n`));
	}

	prepareImageMosaicData() {
		console.log(`ImageMosaic#prepareImageMosaicData`);
		let geojsons = this.getFilesInDirectory(this._source);
		let sources = [];
		geojsons.forEach(pathToGeojson => {
			let geojson = this.getJsonObjectFromFile(pathToGeojson);
			if (geojson.features[0].geometry) {
				let pathToSourceTif = pathToGeojson.replace(`.geojson`, `.tif`);
				let fileMetadata = this.getFileMetadata(pathToSourceTif);
				if (fs.existsSync(pathToSourceTif)) {
					let source = {
						geometry: geojson.features[0].geometry,
						acquisition: fileMetadata.acquisition
					};
					fs.symlinkSync(pathToSourceTif, `${this._destination}/scenes/${fileMetadata.filename}.tif`);
					sources.push(source);
					console.log(`ImageMosaic#prepareImageMosaicData: link`, pathToSourceTif);
				}
			}
		});
		fs.writeFileSync(`${this._destination}/scenes/.sources.json`, JSON.stringify({sources: sources}));
	}

	getJsonObjectFromFile(path) {
		console.log(`ImageMosaic#getJsonObjectFromFile: path`, path);
		return JSON.parse(fs.readFileSync(path));
	}

	getFilesInDirectory(path, files) {
		files = files || [];
		fs.readdirSync(path).forEach((fileName) => {
			if (fs.statSync(`${path}/${fileName}`).isDirectory()) {
				this.getFilesInDirectory(`${path}/${fileName}`, files)
			} else {
				if (fileName.toLowerCase().endsWith(`.geojson`)) {
					files.push(`${path}/${fileName}`);
				}
			}
		});
		return files;
	}

	getFileMetadata(path) {
		console.log(`ImageMosaic#getFileMetadata: path`, path);
		let pathParts = path.split(`/`);
		let filename = pathParts.pop();
		let code = pathParts.pop();
		let acquisition = filename.match(/([0-9]{8}T[0-9]{6})/)[0];

		return {
			filename: `S2_${code}_${acquisition}000Z`,
			acquisition: acquisition
		}
	}

	deleteFolderRecursive(path) {
		if (path && path !== `/` && fs.existsSync(path)) {
			fs.readdirSync(path).forEach((file) => {
				let curPath = path + "/" + file;
				if (fs.lstatSync(curPath).isDirectory()) {
					this.deleteFolderRecursive(curPath);
				} else {
					console.log(`Removing file ${curPath}`);
					fs.unlinkSync(curPath);
				}
			});
			fs.rmdirSync(path);
		}
	};

	prepareImageMosaicDataStructure() {
		return Promise.resolve().then(() => {
			if(fs.existsSync(this._destination) && !fs.existsSync(`${this._destination}/scenes`)) {
				throw new Error(`Unable to delete non-imagemosaic folder!`);
			}
			this.prepareImageMosaicFsStructure();
			this.prepareImageMosaicMetadata();
			this.prepareImageMosaicData();
		}).catch((error) => {
			console.log(`ImageMosaic#prepareImageMosaicDataStructure: error`, error);
		});
	}
}

module.exports = ImageMosaic;