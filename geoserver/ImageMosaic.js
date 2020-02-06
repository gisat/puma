const _ = require(`lodash`);
const fs = require(`fs`);
const turf = require(`@turf/turf`);

const czechRepublicBboxGeometry = {
	"type": "Polygon",
	"coordinates": [[[12.09059, 48.551807], [18.859217, 48.551807], [18.859217, 51.055702], [12.09059, 51.055702], [12.09059, 48.551807]]]
};

class ImageMosaic {
	constructor(source, destination, pgOptions, groupBy, prepareData, pgPool) {
		this._source = source;
		this._destination = destination;
		this._pgOptions = pgOptions;
		this._groupBy = groupBy;
		this._pgPool = pgPool;

		if (prepareData) {
			this.prepareImageMosaicDataStructure();
		}

		this.prepareSourcesTable();
	}

	async prepareSourcesTable() {
		let sourcesFilepath = `${this._destination}/.sources.json`;

		if(fs.existsSync(sourcesFilepath)) {
			console.log(`#### Preparing sentinel 2 sources table...`);

			let sourcesJson = JSON.parse(fs.readFileSync(sourcesFilepath));

			await this._pgPool.query(`DROP TABLE IF EXISTS "sentinel_sources";`);

			await this._pgPool.query(`DROP INDEX IF EXISTS "sentinel_sources_geom_idx";`);

			await this._pgPool.query(`CREATE TABLE "sentinel_sources" (the_geom geometry, acquisition text);`);

			for(let source of sourcesJson.sources) {
				await this._pgPool.query(`INSERT INTO "sentinel_sources" VALUES (ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(source.geometry)}'), 4326)), '${source.acquisition}');`);
			}

			await this._pgPool.query(`CREATE INDEX "sentinel_sources_geom_idx" ON "sentinel_sources" USING GIST (the_geom);`);

			console.log(`#### Preparing of sentinel 2 sources table is done!`);
		}
	}

	getDatesByGeometry(geometry) {
		return this._pgPool.query(`SELECT "acquisition" FROM "sentinel_sources" WHERE ST_Intersects(ST_GeomFromGeoJSON('${JSON.stringify(geometry)}'), "the_geom");`)
			.then((pgResult) => {
				return _.map(pgResult.rows, (row) => {
					let year = row.acquisition.substring(0, 4);
					let month = row.acquisition.substring(4, 6);
					let day = row.acquisition.substring(6, 8);
					let hour = row.acquisition.substring(9, 11);
					let min = row.acquisition.substring(11, 13);
					let sec = row.acquisition.substring(13);
					return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
				});
			})
	}

	prepareImageMosaicFsStructure(groups) {
		return Promise.resolve().then(() => {
			if (fs.existsSync(this._destination) && !fs.existsSync(`${this._destination}/.sources.json`)) {
				throw new Error(`Unable to delete non-imagemosaic folder!`);
			}

			this.deleteFolderRecursive(this._destination);

			fs.mkdirSync(this._destination);

			groups.forEach((groupName) => {
				fs.mkdirSync(`${this._destination}/_${groupName}`);
				fs.mkdirSync(`${this._destination}/_${groupName}/scenes`);
			});
		});
	}

	prepareImageMosaicMetadata(groups) {
		return Promise.resolve().then(() => {
			let indexer = [
				`Caching=false`,
				`TimeAttribute=time`,
				`Schema=*the_geom:Polygon,location:String,time:java.util.Date`,
				`PropertyCollectors=TimestampFileNameExtractorSPI[timeregex](time)`
			];

			let timeregex = [
				`regex=[0-9]{8}T[0-9]{9}Z`
			];

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

			groups.forEach(group => {
				fs.writeFileSync(`${this._destination}/_${group}/indexer.properties`, indexer.join(`\n`));
				fs.writeFileSync(`${this._destination}/_${group}/timeregex.properties`, timeregex.join(`\n`));
				fs.writeFileSync(`${this._destination}/_${group}/datastore.properties`, datastore.join(`\n`));
			});
		});
	}

	prepareImageMosaicData(groups) {
		let geojsons = this.getFilesInDirectory(this._source);
		let sources = [];

		groups.forEach(group => {
			geojsons.forEach(pathToGeojson => {
				let pathToSourceTif = pathToGeojson.replace(`.geojson`, `.tif`);
				let fileMetadata = this.getFileMetadata(pathToSourceTif);

				if (this.getGroupFromAcquisition(fileMetadata.acquisition) === group) {
					let geojson = this.getJsonObjectFromFile(pathToGeojson);
					let geojsonBboxPolygon = turf.bboxPolygon(turf.bbox(geojson));
					if (
						geojson.features[0].geometry
						&& turf.intersect(geojsonBboxPolygon, turf.polygon(czechRepublicBboxGeometry.coordinates))
					) {
						let fileMetadata = this.getFileMetadata(pathToSourceTif);
						if (fs.existsSync(pathToSourceTif)) {
							let source = {
								geometry: geojson.features[0].geometry,
								acquisition: fileMetadata.acquisition
							};
							fs.symlinkSync(pathToSourceTif, `${this._destination}/_${group}/scenes/${fileMetadata.filename}.tif`);
							sources.push(source);
						}
					}
				}
			});
		});
		fs.writeFileSync(`${this._destination}/.sources.json`, JSON.stringify({sources: sources}));
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

	getFileMetadata(path) {
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

	getAvailableFilesGrouped() {
		return Promise.resolve().then(() => {
			let files = this.getFilesInDirectory(this._source, []);
			let filesMetadata = _.map(files, file => {
				return this.getFileMetadata(file);
			});
			return Object.keys(_.groupBy(filesMetadata, fileMetadata => {
				return this.getGroupFromAcquisition(fileMetadata.acquisition);
			}));
		});
	}

	prepareImageMosaicDataStructure() {
		return this.getAvailableFilesGrouped()
			.then(groups => {
				return this.prepareImageMosaicFsStructure(groups)
					.then(() => {
						return groups;
					})
			}).then((groups) => {
				return this.prepareImageMosaicMetadata(groups)
					.then(() => {
						return groups;
					})
			}).then((groups) => {
				return this.prepareImageMosaicData(groups);
			}).catch((error) => {
				console.log(`ImageMosaic#prepareImageMosaicDataStructure: error`, error);
			});
	}

	getGroupFromAcquisition(acquisition) {
		switch (this._groupBy) {
			case `year-month-day`:
				return acquisition.substring(0, 8);
			case `year-month`:
				return acquisition.substring(0, 6);
			default:
				return acquisition.substring(0, 4);
		}
	}
}

module.exports = ImageMosaic;