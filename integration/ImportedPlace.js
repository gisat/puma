var conn = require('../common/conn');
var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

/**
 * For now there is assumption that there will be 4 level of analytical units. It wont work otherwise.
 */
class ImportedPlace {
	constructor(pgPool, tableName) {
		this._level0Name = "NUTS0_wgs";
		this._level1Name = "NUTS1_wgs";
		this._level2Name = "NUTS2_wgs";
		this._level3Name = "NUTS3_wgs";

		this._rasterLayerTable = tableName;
		this._connection = pgPool.pool();

		this._attributeSetId = 4310;
		this._urbanId = 4312;
		this._nonUrbanId = 4313;
		this._scopeId = 4309;
		this._year = 6;
		// TODO: Dodument this structure. Basically I am starting from the lowest level but storing in mongo from highest levels.
		this._areaTemplateLevels = [
			{id: 5, tableName: null},
			{id: 4, tableName: null},
			{id: 3, tableName: null},
			{id: 2, tableName: null}
		];

		this._areaTemplateIds = [2,3,4,5];

		this._layerRefTable = null;
		this._amountOfValidLevels = 0; // It is possible that the area will be too small to be mapped even on one full unit.
	}

	create() {
		var locationId;
		return this.createLocation().then((pLocationId) => {
			locationId = pLocationId;
		}).then(() => {
			return this.createExtent()
		}).then(() => {
			return this.generateTableForLevel(this._level3Name, locationId);
		}).then(() => {
			return this.generateTableForLevel(this._level2Name, locationId);
		}).then(() => {
			return this.generateTableForLevel(this._level1Name, locationId);
		}).then(() => {
			return this.generateTableForLevel(this._level0Name, locationId);
		}).then(() => {
			var promises = [];

			for(let i = 0;i++,this._amountOfValidLevels > 0; this._amountOfValidLevels--) {
				// Ids must always start from 2
				this.createMetadata(this._areaTemplateLevels[this._amountOfValidLevels - 1], this._areaTemplateIds[i], locationId);
			}

			return Promise.all(promises);
		}).then(() => {
			logger.info('ImportedPlace#create Result: ', this._layerRefTable);
			return this._layerRefTable;
		});
	}

	createLocation() {
		let extentSql = `SELECT St_Extent(ST_Envelope(rast)) as extent FROM ${this._rasterLayerTable};`;
		logger.info('ImportedPlace#createLocation Started. SQL: ', extentSql);

		return this._connection.query(extentSql).then((results) => {
			let extent = results.rows[0].extent
				.replace('BOX(', '')
				.replace(')', '')
				.replace(' ', ',')
				.replace(' ', ',');

			return crud.createPromised("location", {
				"active": true,
				"created": "2016-08-04T11:52:52.826Z",
				"createdBy": 1,
				"changed": "2016-08-04T11:53:30.457Z",
				"changedBy": 1,
				"name": "Imported " + conn.getNextId(),
				"bbox": extent,
				"dataset": this._scopeId
			}, {userId: 1})
		}).then((result=> {
			return result._id;
		}));
	}

	createExtent() {
		let addExtentToRaster = `ALTER TABLE ${this._rasterLayerTable} ADD COLUMN extent geometry`;

		logger.info('ImportedPlace#generateTableForLevel createExtent. SQL: ', addExtentToRaster);

		return this._connection.query(addExtentToRaster).then(()=> {
			let fillExtentWithData = `UPDATE ${this._rasterLayerTable} SET extent = subquery.ext FROM (Select St_SetSRID(St_Extent(St_Envelope(${this._rasterLayerTable}.rast))::geometry, 4326) as ext FROM ${this._rasterLayerTable}) AS subquery`;

			logger.info('ImportedPlace#generateTableForLevel fillExtentWithData SQL: ', fillExtentWithData);

			return this._connection.query(fillExtentWithData);
		});
	}

	generateTableForLevel(analyticalUnitsLayer, locationId) {
		logger.info('ImportedPlace#generateTableForLevel analyticalUnitsLayer: ', analyticalUnitsLayer, ' Location: ', locationId);
		let createdTableName = `imported_au_${analyticalUnitsLayer}_${conn.getNextId()}`.toLowerCase();
		let parentId = `analyticalUnits."ParID"`;
		if (this._amountOfValidLevels == 4) {
			parentId = 0;
		}
		let createTableWithOnlyRelevantAU = `CREATE TABLE ${createdTableName} AS (
                SELECT analyticalUnits."NUTS_ID" as gid,
                	${parentId} as parid,
                    analyticalUnits."NUTS_NAME" as name,
                    analyticalUnits.the_geom as the_geom,
                    0 as urban_area,
                    0 as non_urban_area
                FROM ${this._rasterLayerTable} AS rasterLayer 
                INNER JOIN ${analyticalUnitsLayer} AS analyticalUnits 
                    ON ST_Contains(rasterLayer.extent, analyticalUnits.the_geom)    
                GROUP BY(analyticalUnits."NUTS_ID",analyticalUnits."NUTS_NAME", parid, ${parentId != null ? parentId + ',' : ''} gid, the_geom, urban_area, non_urban_area)
            )`;

		logger.info('ImportedPlace#generateTableForLevel createTableWithOnlyRelevantAU SQL: ', createTableWithOnlyRelevantAU);

		return this._connection.query(createTableWithOnlyRelevantAU).then(() => {
			let isAtLeastOneAreaContained = `SELECT count(*) as amount FROM ${createdTableName}`;

			logger.info('ImportedPlace#generateTableForLevel isAtLeastOneAreaContained SQL: ', isAtLeastOneAreaContained);

			return this._connection.query(isAtLeastOneAreaContained);
		}).then((results) => {
			if (results.rows[0].amount > 0) {
				logger.info('ImportedPlace#generateTableForLevel Level is valid');
				this._amountOfValidLevels++;
			}

			let pixelRatio = 10000000000;
			let createIntermediaryTableWithValues = `CREATE TABLE ${createdTableName}_intermediary AS (
            SELECT analyticalUnits."NUTS_ID" as gid, 
                ${pixelRatio} * st_pixelheight(rast) * st_pixelwidth(rast) as pixelSizeSquareMeters,
                (ST_ValueCount(ST_Clip(rasterLayer.rast, analyticalUnits.the_geom), 1)).value as val,
                (ST_ValueCount(ST_Clip(rasterLayer.rast, analyticalUnits.the_geom), 1)).count as amount 
            FROM ${this._rasterLayerTable} AS rasterLayer 
            INNER JOIN ${analyticalUnitsLayer} AS analyticalUnits 
                ON ST_Contains(rasterLayer.extent, analyticalUnits.the_geom)
            )`;

			logger.info('ImportedPlace#generateTableForLevel createIntermediaryTableWithValues SQL: ', createIntermediaryTableWithValues);

			return this._connection.query(createIntermediaryTableWithValues);
		}).then(() => {
			let countUrban = `UPDATE ${createdTableName} set urban_area = subquery.urban 
            FROM (select gid, sum(amount) * pixelSizeSquareMeters as urban from ${createdTableName}_intermediary WHERE val = 255 group by(gid,pixelSizeSquareMeters)) AS subquery 
            WHERE ${createdTableName}.gid = subquery.gid`;

			logger.info('ImportedPlace#generateTableForLevel countUrban SQL: ', countUrban);

			return this._connection.query(countUrban);
		}).then(() => {
			let countNonUrban = `update ${createdTableName} set non_urban_area = subquery.non_urban FROM (select gid, sum(amount) * pixelSizeSquareMeters as non_urban from ${createdTableName}_intermediary WHERE val = 0 group by(gid,pixelSizeSquareMeters)) AS subquery where ${createdTableName}.gid = subquery.gid`;

			logger.info('ImportedPlace#generateTableForLevel countNonUrban SQL: ', countNonUrban);

			// Store name of created table for later usage.
			this._areaTemplateLevels[this._amountOfValidLevels - 1].tableName = createdTableName;
			return this._connection.query(countNonUrban);
		});
	}

	createMetadata(tableName, areaTemplateId, locationId) {
		logger.info('ImportedPlace#createMetadata started. TableName: ', tableName, " AreaTemplateId: ", areaTemplateId, " LocationID: ", locationId);
		// Some of them will have parent columns.
		var baseLayerRef = {
			"layer": `geonode:${tableName}`,
			"location": locationId,
			"year": this._year,
			"active": true,
			"areaTemplate": areaTemplateId,
			"columnMap": [],
			"isData": false,
			"fidColumn": "gid",
			"nameColumn": "name",
			"created": "2016-07-14T14:06:53.961Z",
			"createdBy": 2,
			"changed": "2016-07-14T14:06:53.961Z",
			"changedBy": 2
		};
		var dataLayerRef = {
			"layer": `geonode:${tableName}`,
			"location": locationId,
			"year": this._year,
			"active": true,
			"areaTemplate": areaTemplateId,
			"attributeSet": this._attributeSetId,
			"columnMap": [{
				attribute: this._urbanId,
				column: 'urban_area'
			}, {
				attribute: this._nonUrbanId,
				column: 'non_urban_area'
			}],
			"isData": true,
			"fidColumn": "gid",
			"nameColumn": "name",
			"created": "2016-07-14T14:06:53.961Z",
			"createdBy": 2,
			"changed": "2016-07-14T14:06:53.961Z",
			"changedBy": 2
		};

		// Add parent id for all except the first level. Name of the parent column is stable as it is created earlier in this klass.
		if(this._layerRefTable) {
			baseLayerRef["parentColumn"] = "parid";
		}

		return crud.createPromised("layerref", baseLayerRef, {userId: 1}).then((result) => {
			logger.info('ImportedPlace#createMetadata Result: ', result);

			// I want to keep base layer ref id for the least detailed level available and use it for the view.
			// The first one is the least detailed level, which is the one I need to use later in creation of view.
			if(!this._layerRefTable) {
				this._layerRefTable = result._id;
			}

			return crud.createPromised("layerref", dataLayerRef, {userId: 1});
		});
	}
}

module.exports = ImportedPlace;