var Promise = require('promise');
var util = require('util');

var config = require('../config');
var pg = require('pg');
var MongoClient = require('mongodb').MongoClient;

var logger = require('../common/Logger').applicationWideLogger;
var http = require('http');
var https = require('https');

//maybe one day we can switch to request instead of http and https
//var requestPackage = require('request'); // request was taken by conn.request

/////// DEBUG
//var http = require('http-debug').http;
//var https = require('http-debug').https;
//http.debug = 2;
///////
		
var async = require('async');

var mongodb = null;
var pgDataDB = null;
var pgGeonodeDB = null;
var objectId = null;



function request(options,dataToWrite,callback) {
	logger.info("conn#request Options: ", options);

	var time = new Date().getTime();
//	if (!options.headers || !options.headers['Authorization']) {
//		console.log('no auth',options.host);
//		if (options.host == config.geonodeHost || options.host == config.baseServer) {
//			options.headers = options.headers || {};
//			var auth = 'Basic ' + new Buffer(config.authUser + ':' + config.authPass).toString('base64');
//			options.headers['Authorization'] = auth;
//			console.log('auth set');
//		}
//	}

	var requestEngine = (["https","https:","https://"].indexOf(options.protocol)!=-1) ? https : http;

	delete options.protocol;

	var reqs = requestEngine.request(options, function(resl){
		var output = '';
		resl.setEncoding(options.resEncoding || 'utf8' );
		//console.log(resl.headers['geowebcache-cache-result'] || 'none');
		resl.on('data', function (chunk) {
			output += chunk;
		});
		resl.once('end', function() {
			return callback(null,output,resl);
		});
	});
	reqs.setMaxListeners(0);

	reqs.once('error',function(error) {
		return callback(error);
	});
	if (dataToWrite) {
		reqs.write(dataToWrite);
	}
	reqs.end();
	return reqs;
}


function initGeoserver() {
	var username = config.geoserverUsername;
	var password = config.geoserverPassword;
	var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
	var headers = {
		'Authorization': auth
	};
	var options = {
		host: config.geoserverHost,
		path: config.geoserverPath+'/web',
		headers: headers,
		port: config.geoserverPort,
		method: 'GET'
	};
	var jsid = null;
	request(options, null, function(err, output, resl) {
		if (err) {
			logger.error("conn#init Geoserver request error:", err, "\noutput:", output);
			return;
		}
		var cookies = resl.headers['set-cookie'] || [];
		for (var i=0;i<cookies.length;i++) {
			var cookie = cookies[i];
			if (cookie.search('JSESSIONID')>-1) {
				jsid = cookie.split(';')[0].split('=')[1];
				break;
			}
		}
		require('../api/proxy').setJsid(jsid);

	});
}

function initDatabases(pgDataConnString, pgGeonodeConnString, mongoConnString, callback) {
	pgDataDB = new pg.Client(pgDataConnString);
	pgDataDB.connect();
	pgGeonodeDB = new pg.Client(pgGeonodeConnString);
	pgGeonodeDB.connect();

	// keeping connection alive
	setInterval(function() {
		if (reconnectCommand) {
			clearInterval(reconnectCommand);
		}
		var reconnectCommand = setInterval(function() {
			if(!pgDataDB.activeQuery){
				clearInterval(reconnectCommand);
				pgDataDB.end();
				pgDataDB = new pg.Client(config.pgDataConnString);
				pgDataDB.connect();
				logger.info('conn#initDatabases Data DB reconnected');
			}else{
				logger.info('conn#initDatabases Data DB waiting for reconnect');
			}
		},2000);
	},Math.round(1000*60*60*5.9));

	setInterval(function() {
		if (reconnectCommand) {
			clearInterval(reconnectCommand);
		}
		var reconnectCommand = setInterval(function() {
			if(!pgGeonodeDB.activeQuery){
				clearInterval(reconnectCommand);
				pgGeonodeDB.end();
				pgGeonodeDB = new pg.Client(config.pgGeonodeConnString);
				pgGeonodeDB.connect();
				logger.info('conn#initDatabases Geonode DB reconnected');
			}else{
				logger.info('conn#initiDatabases Geonode DB waiting for reconnect');
			}
		},2000);
	},Math.round(1000*60*60*5.42));

	MongoClient.connect(mongoConnString, function(err, dbs) {
		if (err){
			return callback(err);
		}
		mongodb=dbs;
		var mongoSettings = mongodb.collection('settings');
		mongoSettings.findOne({_id:1},function(err,result) {
			objectId = result ? result.objectId : null;
			if (err || !objectId) return callback(err);
			callback();
		});
	});
}

function init(app, callback) {
	setInterval(function() {
		initGeoserver();
	},590000);
	initGeoserver();

	initDatabases(config.pgDataConnString, config.pgGeonodeConnString, config.mongoConnString, callback);

	//var server = require('http').createServer(app);
	//server.listen(3100);
}

function getIo() {
	return null;
	//return io;
}

function getNextId() {
	var newId = ++objectId;
	var mongoSettings = getMongoDb().collection('settings');
	mongoSettings.update({_id: 1}, {_id: 1,objectId: newId}, {upsert: true}, function() {});
	return newId;
}

function getMongoDb() {
	return mongodb;
}

function getPgDataDb() {
	return pgDataDB;
}
function getPgGeonodeDb() {
	return pgGeonodeDB;
}

function connectToPgDb(connectionString) {
	var pgDatabase = new pg.Client(connectionString);
	pgDatabase.connect();
	return pgDatabase;
}

function getLayerTable(layer){
	var workspaceDelimiterIndex = layer.indexOf(":");
	if(workspaceDelimiterIndex == -1){
		console.log("Warning: getLayerTable got parameter '"+layer+"' without schema delimiter (colon).");
		return layer;
	}
	var workspace = layer.substr(0, workspaceDelimiterIndex);
	var layerName = layer.substr(workspaceDelimiterIndex + 1);
	if(!config.workspaceSchemaMap.hasOwnProperty(workspace)){
		console.log("Error: getLayerTable got layer with unknown workspace '"+ workspace +"'.");
		return workspace + "." + layerName;
	}
	return config.workspaceSchemaMap[workspace] + "." + layerName;
}

/**
 * Gets the name of the geometry column used by particular table.
 *
 * @param {string} sourceTableName - The name of the table holding the geometry column.
 *   The value must always keep the format "schemaName.tableName".
 * @return {string} Geometry column name.
 *   If the table has more geometry columns than the column returned is undefined.
 */
function getGeometryColumnName(sourceTableName) {
	return new Promise(function (resolve, reject) {
		// Extract schema name and table name.
		var nameParts = sourceTableName.split(".");
		var err_msg = "";
		if (nameParts.length != 2) {
			err_msg = util.format("Error: sourceTableName does not keep tj format 'schema.table': %s.", nameParts);
			logger.error(err_msg);
			reject(new Error(err_msg));
		}
		var schemaName = nameParts[0];
		var tableName = nameParts[1];
		if (schemaName == "" || tableName == "") {
			err_msg = util.format("Error: sourceTableName has empty schema or table: %s.", nameParts);
			logger.error(err_msg);
			reject(new Error(err_msg));
		}
	
		// Do lookup.
		// Lookup is made into the same schema the table resides.
		var sql = util.format("SELECT f_geometry_column FROM %s.geometry_columns WHERE f_table_schema = $1 AND f_table_name = $2;", schemaName);
		var client = getPgDataDb();
		client.query(sql, [schemaName, tableName], function(err, results) {
			if (err) {
				err_msg = util.format("conn#getGeometryColumnName Sql. %s Error: ", sql, err);
				logger.error(err_msg);
				return reject(new Error(err_msg));
			}
			if (results.rows.length < 1) {
				err_msg = util.format("conn#getGeometryColumnName found no item for table %s.", sourceTableName);
				logger.error(err_msg);
				return reject(new Error(err_msg));
			}
			var colName = results.rows[0]['f_geometry_column'];
			resolve(colName);
		});
	});
}

module.exports = {
	init: init,
	getIo: getIo,
	request: request,
	connectToPgDb: connectToPgDb,
	initDatabases: initDatabases,
	getMongoDb: getMongoDb,
	getPgDataDb: getPgDataDb,
	getPgGeonodeDb: getPgGeonodeDb,
	getNextId: getNextId,
	getLayerTable: getLayerTable,
	getGeometryColumnName: getGeometryColumnName
};
