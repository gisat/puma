var logger = require('../common/Logger').applicationWideLogger;
var config = require('../config');
var Promise = require('promise');

class PgLayer {
	/**
	 * Name represents the name of the layer.
	 * @param name {String} Name of the layer as perceived by Geoserver and Geonode.
	 * @param fidColumn {String} Name of the column which is created. In case of raster layer there is no need for this.
	 * @param type {String} Represents type of the layer - au, vector, raster
	 * @param connectionPool {PgPool}
	 */
	constructor(name, fidColumn, type, connectionPool) {
		if(!connectionPool || !name || (!fidColumn && type =='vector')) {
			throw new Error(
				logger.error('PgLayer#constructor Incomplete data Name: ', name, ' fidColumn: ', fidColumn, ' Pool: ', !!connectionPool)
			);
		}

		/**
		 * Name of this layer as perceived from the outside
		 * @type {String}
		 */
		this.name = name;

		/**
		 * Name of the column containing the identifier inside of this layer.
		 * @type {String}
		 */
		this.fidColumn = fidColumn;

		/**
		 * Connection pool.
		 * @type {PgPool}
		 */
		this.connectionPool = connectionPool;

		this.type = type;
	}

	/**
	 * It validates this layer.
	 * @returns {Promise}
	 */
	validate() {
		if(!config.isUrbis) {
			return this.checkId();
		} else {
			return Promise.resolve(true);
		}
	}

	/**
	 * It checks whether values in the column containing Id are Unique.
	 * @returns {Promise.<T>}
	 */
	checkId() {
		if(this.type == 'raster' || this.type == 'au') {
			return Promise.resolve(true);
		}

		var self = this;
		var from = this.tableName();

		var pool = this.connectionPool.pool();
		var sql = 'SELECT COUNT("' + self.fidColumn + '") FROM ' + from + ' GROUP BY "' + self.fidColumn + '" HAVING COUNT("' + self.fidColumn + '") > 1';
		return pool.query({
			text: sql
		}).then(function (result) {
			if (result.rowCount > 0) {
				throw new Error('ID is not unique!');
			}
		}).catch(function (err) {
			throw new Error(
				logger.error('PgLayer#checkUniquenessId Error: ', err, ' Layer name:', self.name, ' Fid column', self.fidColumn)
			);
		});
	}

	tableName() {
		var workspaceDelimiterIndex = this.name.indexOf(":");
		if (workspaceDelimiterIndex == -1) {
			console.log("Warning: getLayerTable got parameter '" + this.name + "' without schema delimiter (colon).");
			return this.name;
		}
		var workspace = this.name.substr(0, workspaceDelimiterIndex);
		var layerName = this.name.substr(workspaceDelimiterIndex + 1);
		if (!config.workspaceSchemaMap.hasOwnProperty(workspace)) {
			console.log("Error: getLayerTable got layer with unknown workspace '" + workspace + "'.");
			return workspace + "." + layerName;
		}
		return config.workspaceSchemaMap[workspace] + "." + layerName;
	}

	tableData(columns) {
		var self = this;
		var pool = this.connectionPool.pool();
		var sql = `SELECT ${columns.slice()} FROM ${this.tableName()}`;
		return pool.query({
			text: sql
		});
	}
}

module.exports = PgLayer;