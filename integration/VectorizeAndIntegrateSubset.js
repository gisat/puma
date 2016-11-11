var child_process = require('pn/child_process');
var config = require('../config');
var superagent = require('superagent');
var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');

class VectorizeAndIntegrateSubset {
	constructor(tableName, locationId) {
		this._tifLocation = tableName + '.tif';
		this._tableNameVector = "vec" + tableName;
		this._locationId = locationId;
	}

	process() {
		return this.vectorize().then(()=> {
			return this.importToGeonode();
		}).then(() => {
			return this.createMetadata();
		})
	}

	vectorize() {
		logger.info('VectorizeAndIntegrateSubset#vectorize Start');
		return child_process.exec(`gdal_polygonize.py ${config.temporaryDownloadedFilesLocation}${this._tifLocation} -f PostgreSQL PG:"dbname='${config.pgDataDatabase}' user='${config.pgDataUser}'" ${this._tableNameVector}`).promise;
	}

	importToGeonode() {
		logger.info('VectorizeAndIntegrateSubset#importToGeonode Start');
		return superagent.get(`http://urban-tep.gisat.cz/cgi-bin/publishlayer?l=${this._tableNameVector}&d=datastore&p=EPSG:4326`).then(() => {
			logger.info('VectorizeAndIntegrateSubset#importToGeonode published');
			return superagent.get(`http://urban-tep.gisat.cz/cgi-bin/updatelayers?f=${this._tableNameVector}&s=datastore&w=geonode`);
		})
	}

	createMetadata() {
		logger.info('VectorizeAndIntegrateSubset#createMetadata started');
		return crud.createPromised("layerref", {
			"layer": `geonode:${this._tableNameVector}`,
			"location": this._locationId,
			"year": 6,
			"active": true,
			"areaTemplate": 4315,
			"columnMap": [],
			"isData": false,
			"fidColumn": "ogc_fid"
		}, {userId: 1})
	}
}

module.exports = VectorizeAndIntegrateSubset;