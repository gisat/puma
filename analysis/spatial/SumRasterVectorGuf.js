var util = require('util');
var conn = require('../../common/conn');
var crud = require('../../rest/crud');

var logger = require('../../common/Logger').applicationWideLogger;

var Promise = require('promise');
var _ = require('underscore');
var UUID = require('../../common/UUID');

var SumRasterVectorGuf = function (analyticalUnitsTable, rasterLayerTable, areaTemplateId) {
	this.analyticalUnitsTable = analyticalUnitsTable;
	this.rasterLayerTable = rasterLayerTable;
	this.areaTemplateId = areaTemplateId; // Also featureLayerTemplates

	this.analysisId = 6456;
	this.locationId = 6294;
	this.yearId = 6460;
	this.attributeSetId = 6455;
	this.attributeUrbanizedId = 6307;
	this.attributeNonUrbanizedId = 6340;
	this.scopeId = 6291;
};

SumRasterVectorGuf.prototype.prepareSql = function (analyticalUnitsTable, rasterLayerTable) {
	return util.format("SELECT analyticalUnits.gid as gid, analyticalUnits.area as area, ST_Height(ST_Clip(rasterLayer.rast, analyticalUnits.the_geom)) as height, ST_Width(ST_Clip(rasterLayer.rast, analyticalUnits.the_geom)) as width, (ST_ValueCount(ST_Clip(rasterLayer.rast, analyticalUnits.the_geom), 1)).value as val, (ST_ValueCount(ST_Clip(rasterLayer.rast, analyticalUnits.the_geom),1)).count as amount FROM %s AS rasterLayer INNER JOIN %s AS analyticalUnits ON ST_Intersects(rasterLayer.rast, analyticalUnits.the_geom)", rasterLayerTable, analyticalUnitsTable);
};

SumRasterVectorGuf.prototype.run = function () {
	var self = this;
	return new Promise(function (resolve, reject) {
		logger.info("SumRasterVectorGuf#run Analysis started.");
		var sql = self.prepareSql(self.analyticalUnitsTable, self.rasterLayerTable);
		conn.getPgDataDb().query(sql, function (error, results) {
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
				results.rows.forEach(function (row) {
					if (groupByAnalyticalId[row.gid] == null) {
						groupByAnalyticalId[row.gid] = {
							gid: row.gid,
							sumOfArea: 0,
							countOfUrbanized: 0,
							countOfNonUrbanized: 0,
							areaOfUrbanized: 0,
							areaOfNonUrbanized: 0
						}
					}

					var informationForUnitWithGid = groupByAnalyticalId[row.gid];
					informationForUnitWithGid.sumOfArea += (row.height * row.width);
					if (row.val == 255) {
						informationForUnitWithGid.countOfUrbanized += row.amount;
					} else {
						informationForUnitWithGid.countOfNonUrbanized += row.amount;
					}
					informationForUnitWithGid.areaOfUrbanized = informationForUnitWithGid.countOfUrbanized / (informationForUnitWithGid.countOfUrbanized + informationForUnitWithGid.countOfNonUrbanized) * 100;
					informationForUnitWithGid.areaOfNonUrbanized = informationForUnitWithGid.countOfNonUrbanized / (informationForUnitWithGid.countOfUrbanized + informationForUnitWithGid.countOfNonUrbanized) * 100;
				});

				self.storeAnalysis(groupByAnalyticalId).then(function () {
					resolve();
				});
			}
		})
	});
};

SumRasterVectorGuf.prototype.storeAnalysis = function (resultsOfAnalysis) {
	logger.info("SumRasterVectorGuf#storeAnalysis Store information about finished analysis.", resultsOfAnalysis);
	var self = this;
	return this.createPerformedAnalysis().then(function (performedAnalysis) {
		var performedAnalysisId = performedAnalysis._id;
		return new Promise(function (resolve, reject) {
			var sqlToCreateAnalysisTable = util.format("create table analysis.an_%s_%s (gid integer PRIMARY KEY, as_%s_attr_%s double precision, as_%s_attr_%s double precision)", performedAnalysisId, self.areaTemplateId, self.attributeSetId, self.attributeUrbanizedId, self.attributeSetId, self.attributeNonUrbanizedId);
			conn.getPgDataDb().query(sqlToCreateAnalysisTable, function (error) {
				if (error) {
					throw new Error(
						logger.error("SumRasterVectorGuf#process Error when executing SQL: ", sql, " Error: ", error)
					);
				}

				self.storeRows(_.values(resultsOfAnalysis), performedAnalysisId).then(function () {
					resolve(performedAnalysisId);
				});
			});
		});
	}).then(function (performedAnalysisId) {
		return self.createLayerRefForAnalysis(performedAnalysisId);
	}).catch(function(error){
		throw new Error(
			logger.error("SumRasterVectorGuf#storeAnalysis Error: ", error)
		);
	});

};

SumRasterVectorGuf.prototype.storeRows = function (rowsValues, performedAnalysisId) {
	logger.info("SumRasterVectorGuf#storeRows Rows.", rowsValues);
	var self = this;
	return new Promise(function (resolve, reject) {
		var sql = "";
		rowsValues.forEach(function (row) {
			var rowSql = util.format("insert into analysis.an_%s_%s (gid, as_%s_attr_%s, as_%s_attr_%s) values(%s,%s,%s);", performedAnalysisId, self.areaTemplateId, self.attributeSetId, self.attributeUrbanizedId, self.attributeSetId, self.attributeNonUrbanizedId, row.gid, row.countOfUrbanized * 10 * 10, row.countOfNonUrbanized * 10 * 10);
			sql += rowSql;
		});

		conn.getPgDataDb().query(sql, function (err, results) {
			if (err) {
				throw new Error(
					logger.error("SumRasterVectorGuf#storeRows Couldn't insert the information about rows. Sql: ", sql)
				);
			}

			resolve();
		});

	});
};

// TODO: Move outside.
SumRasterVectorGuf.prototype.createPerformedAnalysis = function () {
	logger.info("SumRasterVectorGuf#createPerformedAnalysis Started");

	var self = this;
	return new Promise(function (resolve, reject) {
		var id =new UUID().withoutDelimiters();
		var performedAnalysis = {
			"_id": id,
			"id": id,
			"analysis": self.analysisId,
			"dataset": self.scopeId,
			"featureLayerTemplates": [
				self.areaTemplateId
			],
			"status": "Success",
			"location": self.locationId,
			"year": self.yearId,
			"finished": new Date()
		};

		crud.create("performedanalysis", performedAnalysis, {userId: 1}, function (err, result) {
			if (err) {
				throw new Error(
					logger.error("SumRasterVectorGuf#createPerformedAnalysis. Error: ", err)
				);
			}

			resolve(result);
		});
	});
};

SumRasterVectorGuf.prototype.createLayerRefForAnalysis = function (performedAnalysisId) {
	logger.info("SumRasterVectorGuf#createLayerRefForAnalysis for analysis: ", performedAnalysisId, " Started");

	var self = this;
	return new Promise(function (resolve, reject) {
		var layerRef = {
			"location": self.locationId,
			"year": self.yearId,
			"areaTemplate": self.areaTemplateId,
			"isData": true,
			"fidColumn": "gid",
			"attributeSet": self.attributeSetId,
			"columnMap": [
				{
					"column": "as_" + self.attributeSetId + "_attr_" + self.attributeUrbanizedId,
					"attribute": self.attributeUrbanizedId
				},
				{
					"column": "as_" + self.attributeSetId + "_attr_" + self.attributeNonUrbanizedId,
					"attribute": self.attributeNonUrbanizedId
				}
			],
			"layer": "analysis:an_" + performedAnalysisId + "_" + self.areaTemplateId,
			"analysis": self.analysisId
		};
		crud.create("layerref", layerRef, {userId: 1}, function (err, result) {
			if (err) {
				throw new Error(
					logger.error("SumRasterVectorGuf#createLayerRefForAnalysis ")
				);
			}

			resolve(result);
		});
	});
};
// END of move outside.

module.exports = SumRasterVectorGuf;