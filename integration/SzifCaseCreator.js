const shpjs = require('shpjs');
const zipLocal = require('zip-local');

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

		return this.getGeojsonGeometry(beforeFilePath)
			.then((beforeGeometry) => {
				caseMetadata.beforeGeometry = beforeGeometry;
				return this.getGeojsonGeometry(afterFilePath)
			})
			.then((afterGeometry) => {
				caseMetadata.afterGeometry = afterGeometry;
				return this.prepareMongoLocationMetadata(caseMetadata);
			})
			.then((mongoLocationMetadata) => {
				return new MongoLocations(this._mongo).add(mongoLocationMetadata);
			});
	}

	prepareMongoLocationMetadata(szifCaseMetadata) {
		return Promise.resolve().then(() => {
			return {
				_id: conn.getNextId(),
				active: true,
				name: szifCaseMetadata.caseName,
				bbox: szifCaseMetadata.afterGeometry.bbox.join(`,`),
				dataset: Number(szifCaseMetadata.scopeId),
				changeReviewGeometryBefore: szifCaseMetadata.beforeGeometry,
				changeReviewGeometryAfter: szifCaseMetadata.afterGeometry
			}
		});
	}

	getGeojsonGeometry(zipBufferOrStringPathToZipInput) {
		return new Promise((resolve, reject) => {
			zipLocal.unzip(zipBufferOrStringPathToZipInput, (error, unzipped) => {
				if (!error) {
					let prjString, shpBuffer;

					unzipped.save(null, () => {
					});

					let unzippedFs = unzipped.memory();

					unzippedFs.contents().forEach((contentFile) => {
						if (contentFile.toLowerCase().endsWith(`.prj`)) {
							prjString = unzippedFs.read(contentFile, `text`);
						} else if (contentFile.toLowerCase().endsWith(`.shp`)) {
							shpBuffer = unzippedFs.read(contentFile, `buffer`);
						}
					});

					if (shpBuffer && prjString) {
						resolve(shpjs.parseShp(shpBuffer, prjString)[0]);
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