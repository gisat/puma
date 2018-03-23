const _ = require(`lodash`);
const fs = require(`fs`);
const turf = require(`@turf/turf`);

class ImageMosaic {
	constructor(source, destination) {
		this._source = source;
		this._destination = destination;
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
		this.deleteFolderRecursive(this._destination);
		fs.mkdirSync(this._destination);
		fs.mkdirSync(`${this._destination}/scenes`);
	}

	prepareImageMosaicMetadata() {
		let indexer = [
			`Caching=false`,
			`TimeAttribute=time`,
			`Schema=*the_geom:Polygon,location:String,time:java.util.Date`,
			`PropertyCollectors=TimestampFileNameExtractorSPI[timeregex](time)`
		];
		fs.writeFileSync(`${this._destination}/indexer.properties`, indexer.join(`\n`));

		let timeregex = [
			`regex=[0-9]{8}T[0-9]{6}`
		];
		fs.writeFileSync(`${this._destination}/timeregex.properties`, timeregex.join(`\n`));
	}

	prepareImageMosaicData() {
		this.prepareImageMosaicFsStructure();
		this.prepareImageMosaicMetadata();
		let geojsons = this.getFilesInDirectory(this._source);
		let sources = [];
		geojsons.forEach(pathToGeojson => {
			let geojson = this.getJsonObjectFromFile(pathToGeojson);
			if (geojson.features[0].geometry) {
				let pathToSourceTif = pathToGeojson.replace(`.geojson`, `_str.tif`);
				let fileMetadata = this.getFIleMetadata(pathToSourceTif);
				if (fs.existsSync(pathToSourceTif)) {
					let source = {
						geometry: geojson.features[0].geometry,
						acquisition: fileMetadata.acquisition
					};
					fs.symlinkSync(pathToSourceTif, `${this._destination}/scenes/${fileMetadata.filename}.tif`);
					sources.push(source);
					console.log(`Created link to file`, pathToSourceTif);
				}
			}
		});
		fs.writeFileSync(`${this._destination}/scenes/.sources.json`, JSON.stringify({sources: sources}));
	}

	getJsonObjectFromFile(path) {
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

	getFIleMetadata(path) {
		let pathParts = path.split(`/`);
		let filename = pathParts.pop();
		let code = pathParts.pop();
		let acquisition = filename.match(/([0-9]{8}T[0-9]{6})/)[0];

		return {
			filename: `S2_${code}_${acquisition}`,
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
}

module.exports = ImageMosaic;