var util = require('util');
var conn = require('../../common/conn');
var logger = require('../../common/Logger').applicationWideLogger;

var Promise = require('promise');
var _ = require('underscore');

var SumRasterVectorGuf = function (analyticalUnitsTable, rasterLayerTable, layerReferenceId) {
	this.analyticalUnitsTable = analyticalUnitsTable;
	this.rasterLayerTable = rasterLayerTable;
	this.layerReferenceId = layerReferenceId;

	this.analysisId = '';
};

SumRasterVectorGuf.prototype.prepareSql = function (analyticalUnitsTable, rasterLayerTable) {
	return util.format("SELECT analyticalUnits.gid as gid, analyticalUnits.\"NUTS_ID\" as analyticalUnitId, ST_Height(ST_Clip(rasterLayer.rast, analyticalUnits.the_geom)) as height, ST_Width(ST_Clip(rasterLayer.rast, analyticalUnits.the_geom)) as width, (ST_ValueCount(ST_Clip(rasterLayer.rast, analyticalUnits.the_geom), 1)).value as val, (ST_ValueCount(ST_Clip(rasterLayer.rast, analyticalUnits.the_geom),1)).count as amount FROM %s AS rasterLayer INNER JOIN %s AS analyticalUnits ON ST_Intersects(rasterLayer.rast, analyticalUnits.the_geom)", analyticalUnitsTable, rasterLayerTable);
};

SumRasterVectorGuf.prototype.run = function () {
	var self = this;
	return new Promise(function (resolve, reject) {
		var sql = self.prepareSql(self.analyticalUnitsTable, self.rasterLayerTable);
		conn.getPgGeonodeDb().query(sql, function (error, results) {
			if (error) {
				throw new Error(
					logger.error("SumRasterVectorGuf#process Error when executing SQL: ", sql, " Error: ", error)
				);
			}

			if (!results.rows.length) {
				logger.warn("SumRasterVectorGuf#process No results from SQL: ", sql);
				resolve({});
			} else {
				var groupByAnalyticalId = {};
				results.rows.forEach(function(row){
					if(row.val != 255) {
						return;
					}

					if(groupByAnalyticalId[row.analyticalUnitId] == null) {
						groupByAnalyticalId[row.analyticalUnitId] = {
							gid: row.gid,
							id: row.analyticalUnitId,
							sumOfArea: 0,
							countOfUrbanized: 0,
							areaOfUrbanized: 0
						}
					}

					var informationForUnitWithGid = groupByAnalyticalId[row.analyticalUnitId];
					informationForUnitWithGid.sumOfArea += (row.height * row.width);
					informationForUnitWithGid.countOfUrbanized += row.amount;
					informationForUnitWithGid.areaOfUrbanized = informationForUnitWithGid.countOfUrbanized / informationForUnitWithGid.sumOfArea
				});

				self.storeAnalysis(groupByAnalyticalId);
			}
		})
	});
};

SumRasterVectorGuf.prototype.storeAnalysis = function(resultsOfAnalysis) {
	// Create performed analysis.
	// Also alter table with the areatemplate and add relevant columns. Or fill in the data if the column already exists.

	var sqlToCreateAnalysisTable = util.format("create table analysis.an_%s_%s", this.performedAnalysisId, this.layerReferenceId);
	conn.getPgGeonodeDb().query(sqlToCreateAnalysisTable, function (error) {
		if (error) {
			throw new Error(
				logger.error("SumRasterVectorGuf#process Error when executing SQL: ", sql, " Error: ", error)
			);
		}
		// For each value in resultsofAnalysis insert a row.
		_.values(resultsOfAnalysis).forEach(function(){
			
		});
	});
};

SumRasterVectorGuf.prototype.createPerformedAnalysis = function() {
	var performedAnalysis = {

	};
	crud.create("performedanalysis", performedAnalysis);
};

SumRasterVectorGuf.prototype.storeRow = function(gidResult) {
	
};

module.exports = SumRasterVectorGuf;