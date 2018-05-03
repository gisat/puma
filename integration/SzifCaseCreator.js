const shpjs = require('shpjs');
const zipLocal = require('zip-local');
const turf = require('@turf/turf');
const reproject = require('reproject');

const conn = require('../common/conn');

const MongoLocations = require('../metadata/MongoLocations');

class SzifCaseCreator {
	constructor(pgPool, mongo) {
		this._pgPool = pgPool;
		this._mongo = mongo;
	}

	create(caseName, scopeId, beforeFilePath, afterFilePath) {
		let caseMetadata = {
			caseName,
			scopeId,
			beforeGeometry: null,
			afterGeometry: null
		};

		let mongoLocation;
		return this.getGeojsonGeometry(beforeFilePath)
			.then((geometry) => {
				return this.reprojectGeojsonGeometryFromKrovakToWgs(geometry);
			})
			.then((beforeGeometry) => {
				caseMetadata.beforeGeometry = beforeGeometry;
				return this.getGeojsonGeometry(afterFilePath)
					.then((geometry) => {
						return this.reprojectGeojsonGeometryFromKrovakToWgs(geometry);
					});
			})
			.then((afterGeometry) => {
				caseMetadata.afterGeometry = afterGeometry;
				return this.prepareMongoLocationMetadata(caseMetadata)
			})
			.then((mongoLocationMetadata) => {
				mongoLocation = mongoLocationMetadata;
				return new MongoLocations(this._mongo).add(mongoLocationMetadata);
			}).then(() => {
				return mongoLocation;
			});
	}

	prepareMongoLocationMetadata(szifCaseMetadata) {
		return Promise.resolve().then(() => {
			return {
				_id: conn.getNextId(),
				active: true,
				name: szifCaseMetadata.caseName,
				geometry: turf.union({geometry: szifCaseMetadata.beforeGeometry, type: `Feature`}, {geometry: szifCaseMetadata.afterGeometry, type: `Feature`}).geometry,
				dataset: Number(szifCaseMetadata.scopeId),
				changeReviewGeometryBefore: szifCaseMetadata.beforeGeometry,
				changeReviewGeometryAfter: szifCaseMetadata.afterGeometry
			}
		});
	}

	reprojectGeojsonGeometryFromKrovakToWgs(geometry) {
		console.log(`######`, geometry);
		return Promise.resolve().then(() => {
			return reproject.reproject(
				geometry,
				`+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=542.5,89.2,456.9,5.517,2.275,5.516,6.96 +pm=greenwich +units=m +no_defs`,
				`+proj=longlat +datum=WGS84 +no_defs`
			);
		});
	}

	getGeojsonGeometry(zipBufferOrStringPathToZipInput) {
		return new Promise((resolve, reject) => {
			zipLocal.unzip(zipBufferOrStringPathToZipInput, (error, unzipped) => {
				if (!error) {
					let shpBuffer;

					unzipped.save(null, () => {
					});

					let unzippedFs = unzipped.memory();

					unzippedFs.contents().forEach((contentFile) => {
						if (contentFile.toLowerCase().endsWith(`.shp`)) {
							shpBuffer = unzippedFs.read(contentFile, `buffer`);
						}
					});

					if (shpBuffer) {
						resolve(shpjs.parseShp(shpBuffer)[0]);
					} else {
						reject(new Error(`missing prj or shp`));
					}
				} else {
					reject(error);
				}
			});
		});
	}
}

module.exports = SzifCaseCreator;